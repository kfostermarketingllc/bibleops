/**
 * BibleOps Premium - API Routes
 * Premium subscription endpoints
 */

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./database');
const { generateToken, verifyToken, requirePremium } = require('./auth-middleware');
const stripeService = require('./stripe-service');

const router = express.Router();

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
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { email, planType } = req.body;

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

// ============================================
// GENERATION ROUTE (Premium)
// ============================================

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
            denomination,
            bibleVersion,
            ageGroup
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

        // TODO: Actually trigger curriculum generation (call existing generation logic)
        // For now, just return success

        res.json({
            success: true,
            message: 'Curriculum generation started',
            jobId: jobId,
            isOverage: isOverage,
            overageCharge: isOverage ? limits.overagePrice : null
        });

    } catch (error) {
        console.error('Premium generation error:', error);
        res.status(500).json({ error: 'Generation failed. Please try again.' });
    }
});

module.exports = router;
