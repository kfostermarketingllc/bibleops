/**
 * BibleOps Premium - API Routes
 * Premium subscription endpoints
 */

const express = require('express');
const bcrypt = require('bcrypt');
const archiver = require('archiver');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const db = require('./database');
const { generateToken, verifyToken, requirePremium } = require('./auth-middleware');
const stripeService = require('./stripe-service');

const router = express.Router();

// Initialize S3 client for downloads
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'bibleops-pdfs';

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * POST /api/premium/signup
 * Create new premium account
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user exists
        const existingUser = await db.getUserByEmail(email);

        if (existingUser && existingUser.password_hash) {
            return res.status(400).json({ error: 'Account already exists. Please log in.' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        if (existingUser && existingUser.tier === 'free') {
            // Upgrade existing free user - just add password
            await db.query(
                'UPDATE users SET password_hash = $1 WHERE email = $2',
                [passwordHash, email]
            );
        } else {
            // Create new user
            await db.createUser(email, passwordHash);
        }

        // Get updated user
        const user = await db.getUserByEmail(email);

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Account created successfully',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
});

/**
 * POST /api/premium/login
 * Login to existing account
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Get user
        const user = await db.getUserByEmail(email);

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ============================================
// STRIPE CHECKOUT ROUTES
// ============================================

/**
 * POST /api/premium/create-checkout-session
 * Create Stripe checkout session for subscription
 * Supports both authenticated and unauthenticated users
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { planType } = req.body;

        // Get email from auth token if available, otherwise from body
        let email = req.body.email;

        // Try to get email from JWT token if present
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                email = decoded.email;
            } catch (e) {
                // Token invalid, continue with body email
            }
        }

        if (!email || !planType) {
            return res.status(400).json({ error: 'Email and plan type required' });
        }

        // Get price ID based on plan type
        let priceId;
        switch (planType) {
            case 'individual_monthly':
                priceId = stripeService.PRICE_IDS.individual_monthly;
                break;
            case 'individual_annual':
                priceId = stripeService.PRICE_IDS.individual_annual;
                break;
            case 'church_monthly':
                priceId = stripeService.PRICE_IDS.church_monthly;
                break;
            default:
                return res.status(400).json({ error: 'Invalid plan type' });
        }

        // Create checkout session
        const session = await stripeService.createCheckoutSession(
            email,
            priceId,
            `${req.protocol}://${req.get('host')}/premium/dashboard.html?checkout=success`,
            `${req.protocol}://${req.get('host')}/premium/index.html?checkout=cancel`
        );

        res.json({ url: session.url });

    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * POST /api/premium/create-portal-session
 * Create Stripe customer portal session
 */
router.post('/create-portal-session', verifyToken, async (req, res) => {
    try {
        if (!req.user.stripe_customer_id) {
            return res.status(400).json({ error: 'No active subscription found' });
        }

        const session = await stripeService.createPortalSession(
            req.user.stripe_customer_id,
            `${req.protocol}://${req.get('host')}/premium/dashboard.html`
        );

        res.json({ url: session.url });

    } catch (error) {
        console.error('Portal session error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// ============================================
// SUBSCRIPTION SYNC ROUTE
// ============================================

/**
 * POST /api/premium/sync-subscription
 * Sync subscription status from Stripe (handles webhook race condition)
 * Called when user returns from checkout
 */
router.post('/sync-subscription', verifyToken, async (req, res) => {
    try {
        const user = req.user;

        // If user already has Stripe customer ID, verify directly with Stripe
        let stripeCustomerId = user.stripe_customer_id;

        // If no customer ID yet, look up by email
        if (!stripeCustomerId) {
            const customer = await stripeService.getCustomerByEmail(user.email);
            if (customer) {
                stripeCustomerId = customer.id;
                // Update user with customer ID
                await db.updateUserStripeCustomerId(user.id, stripeCustomerId);
            }
        }

        if (!stripeCustomerId) {
            return res.json({
                synced: false,
                tier: user.tier,
                message: 'No Stripe customer found'
            });
        }

        // Verify subscription status directly with Stripe
        const subscriptionInfo = await stripeService.verifySubscriptionStatus(stripeCustomerId);

        if (!subscriptionInfo) {
            return res.json({
                synced: false,
                tier: user.tier,
                message: 'No active subscription found in Stripe'
            });
        }

        // Update user tier if different
        if (user.tier !== subscriptionInfo.tier) {
            await db.query(
                'UPDATE users SET tier = $1 WHERE id = $2',
                [subscriptionInfo.tier, user.id]
            );
            console.log(`✅ Synced user ${user.email} tier to: ${subscriptionInfo.tier}`);
        }

        // Upsert subscription record
        await db.upsertSubscription({
            customerId: stripeCustomerId,
            subscriptionId: subscriptionInfo.subscriptionId,
            priceId: null, // Will be filled by webhook
            planType: subscriptionInfo.planType,
            status: subscriptionInfo.status,
            currentPeriodStart: Math.floor(subscriptionInfo.currentPeriodStart.getTime() / 1000),
            currentPeriodEnd: Math.floor(subscriptionInfo.currentPeriodEnd.getTime() / 1000),
            trialStart: null,
            trialEnd: null
        });

        res.json({
            synced: true,
            tier: subscriptionInfo.tier,
            subscriptionStatus: subscriptionInfo.status,
            periodEnd: subscriptionInfo.currentPeriodEnd
        });

    } catch (error) {
        console.error('Sync subscription error:', error);
        res.status(500).json({ error: 'Failed to sync subscription status' });
    }
});

// ============================================
// USAGE & STATS ROUTES
// ============================================

/**
 * GET /api/premium/usage
 * Get user's usage statistics
 */
router.get('/usage', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const limits = stripeService.getTierLimits(user.tier);

        let usageThisMonth = 0;
        let overageCount = 0;
        let periodStart, periodEnd;

        if (user.tier === 'free') {
            // Free tier: last 45 days
            usageThisMonth = await db.getFreeUsageCount(user.id);
            periodStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
            periodEnd = new Date();
        } else {
            // Premium tier: current billing period
            const subscription = await db.getActiveSubscription(user.id);

            if (subscription) {
                periodStart = subscription.current_period_start;
                periodEnd = subscription.current_period_end;
                usageThisMonth = await db.getUsageCount(user.id, periodStart);
                overageCount = await db.getOverageCount(user.id, periodStart);
            }
        }

        res.json({
            tier: user.tier,
            usageThisMonth: usageThisMonth,
            monthlyLimit: limits.monthlyLimit,
            overageCount: overageCount,
            overageAllowed: limits.overageAllowed,
            overagePrice: limits.overagePrice || null,
            periodStart: periodStart,
            periodEnd: periodEnd,
            subscriptionStatus: user.tier === 'free' ? 'Free' : 'Active'
        });

    } catch (error) {
        console.error('Usage stats error:', error);
        res.status(500).json({ error: 'Failed to load usage statistics' });
    }
});

/**
 * GET /api/premium/history
 * Get user's generation history
 */
router.get('/history', verifyToken, async (req, res) => {
    try {
        const history = await db.getGenerationHistory(req.user.id, 20);

        // Format history with download URLs (TODO: generate presigned URLs)
        const formattedHistory = history.map(item => ({
            id: item.id,
            title: item.passage || item.theme || item.book_title || 'Curriculum',
            studyFocus: item.study_focus,
            createdAt: item.created_at,
            isOverage: item.is_overage,
            downloadUrl: `/api/premium/download/${item.job_id}` // Placeholder
        }));

        res.json({ history: formattedHistory });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to load generation history' });
    }
});

/**
 * GET /api/premium/download/:jobId
 * Download all PDFs for a generation as a ZIP file
 */
router.get('/download/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        // Get generation record
        const generation = await db.getGenerationByJobId(userId, jobId);

        if (!generation) {
            return res.status(404).json({ error: 'Generation not found' });
        }

        // Check if S3 keys are stored
        if (!generation.s3_keys) {
            return res.status(404).json({
                error: 'Download not available',
                message: 'PDF files are no longer available. Files are stored for 7 days after generation.'
            });
        }

        // Parse S3 keys
        let s3Keys;
        try {
            s3Keys = typeof generation.s3_keys === 'string'
                ? JSON.parse(generation.s3_keys)
                : generation.s3_keys;
        } catch (parseError) {
            console.error('Failed to parse S3 keys:', parseError);
            return res.status(500).json({ error: 'Failed to process download' });
        }

        if (!s3Keys || s3Keys.length === 0) {
            return res.status(404).json({ error: 'No files available for download' });
        }

        // Create ZIP filename based on study content
        const studyName = generation.passage || generation.theme || generation.book_title || 'BibleStudy';
        const sanitizedName = studyName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
        const zipFilename = `BibleOps_${sanitizedName}_${jobId.split('_')[1]}.zip`;

        // Set response headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        // Create archive
        const archive = archiver('zip', { zlib: { level: 5 } });

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create download' });
            }
        });

        // Pipe archive to response
        archive.pipe(res);

        // Fetch each PDF from S3 and add to archive
        for (const file of s3Keys) {
            try {
                const command = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: file.s3Key
                });

                const s3Response = await s3Client.send(command);

                // Add file to archive with a clean filename
                const cleanFilename = file.filename || `${file.title}.pdf`;
                archive.append(s3Response.Body, { name: cleanFilename });

                console.log(`📄 Added to ZIP: ${cleanFilename}`);
            } catch (s3Error) {
                console.error(`Failed to fetch ${file.s3Key}:`, s3Error.message);
                // Continue with other files even if one fails
            }
        }

        // Finalize the archive
        await archive.finalize();

        console.log(`✅ ZIP download complete: ${zipFilename}`);

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to create download' });
        }
    }
});

// ============================================
// GENERATION ROUTE (Premium)
// ============================================

// Import the Bible study generator
const { generateBibleStudy } = require('./bible-study-generator');

/**
 * POST /api/premium/generate
 * Generate curriculum for premium users
 */
router.post('/generate', verifyToken, requirePremium, async (req, res) => {
    try {
        const user = req.user;
        const {
            studyFocus,
            passage,
            theme,
            bookTitle,
            bookAuthor,
            bookISBN,
            bookISBN13,
            bookPassage,
            denomination,
            bibleVersion,
            ageGroup,
            duration,
            userThoughts,
            groupSize,
            teachingContext,
            selectedOutputs,
            confirmOverage
        } = req.body;

        // Get tier limits
        const limits = stripeService.getTierLimits(user.tier);

        // Get current subscription for billing period
        const subscription = await db.getActiveSubscription(user.id);

        if (!subscription) {
            return res.status(403).json({ error: 'No active subscription found' });
        }

        const periodStart = subscription.current_period_start;
        const periodEnd = subscription.current_period_end;

        // Check usage
        const usageThisMonth = await db.getUsageCount(user.id, periodStart);

        let isOverage = false;
        let overageCharge = null;

        if (usageThisMonth >= limits.monthlyLimit) {
            if (!limits.overageAllowed) {
                return res.status(403).json({
                    error: 'Monthly limit reached',
                    message: `You've used all ${limits.monthlyLimit} generations this month`
                });
            }

            // User must confirm overage charge
            if (!confirmOverage) {
                return res.status(402).json({
                    error: 'Overage confirmation required',
                    message: 'Additional generation requires $4.99 overage charge',
                    requiresOverageConfirmation: true
                });
            }

            // Charge overage
            isOverage = true;
            overageCharge = limits.overagePrice * 100; // Convert to cents

            try {
                await stripeService.chargeOverage(
                    user.stripe_customer_id,
                    overageCharge,
                    'BibleOps Overage Generation ($4.99)'
                );
            } catch (chargeError) {
                return res.status(402).json({
                    error: 'Overage payment failed',
                    message: 'Unable to charge for overage generation. Please update your payment method.'
                });
            }
        }

        // Create generation record
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.createGeneration({
            userId: user.id,
            jobId: jobId,
            studyFocus: studyFocus,
            passage: passage,
            theme: theme,
            bookTitle: bookTitle,
            bookAuthor: bookAuthor,
            denomination: denomination,
            bibleVersion: bibleVersion,
            ageGroup: ageGroup,
            tierAtGeneration: user.tier,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            isOverage: isOverage,
            overageChargeAmount: isOverage ? limits.overagePrice : null,
            status: 'pending'
        });

        // Build form data for the generator (matching free version format)
        const formData = {
            email: user.email,
            studyFocus: studyFocus,
            passage: passage,
            theme: theme,
            bookTitle: bookTitle,
            bookAuthor: bookAuthor,
            bookISBN: bookISBN,
            bookISBN13: bookISBN13,
            bookPassage: bookPassage,
            denomination: denomination,
            bibleVersion: bibleVersion,
            ageGroup: ageGroup,
            duration: duration || '8 weeks',
            userThoughts: userThoughts || '',
            groupSize: groupSize || 'Small group (8-12 people)',
            teachingContext: teachingContext || 'Small group Bible study',
            selectedOutputs: selectedOutputs || [],
            jobId: jobId,
            isPremium: true,
            isOverage: isOverage
        };

        // Immediately respond to the client
        res.json({
            success: true,
            message: 'Curriculum generation started',
            jobId: jobId,
            isOverage: isOverage,
            overageCharge: isOverage ? limits.overagePrice : null
        });

        // Trigger async generation (don't await - let it run in background)
        generateBibleStudy(formData)
            .then(async (results) => {
                console.log(`✅ Premium generation complete for job ${jobId}`);
                // Update generation record with completion status
                await db.query(
                    'UPDATE generations SET status = $1, completed_at = NOW() WHERE job_id = $2',
                    ['completed', jobId]
                );
            })
            .catch(async (error) => {
                console.error(`❌ Premium generation failed for job ${jobId}:`, error);
                // Update generation record with failed status
                await db.query(
                    'UPDATE generations SET status = $1, error_message = $2 WHERE job_id = $3',
                    ['failed', error.message, jobId]
                );
            });

    } catch (error) {
        console.error('Premium generation error:', error);
        res.status(500).json({ error: 'Generation failed. Please try again.' });
    }
});

module.exports = router;
