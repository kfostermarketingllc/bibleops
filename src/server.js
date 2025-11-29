const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { generateBibleStudy } = require('./bible-study-generator');
const { sendCurriculumEmailWithLinks, testConnection } = require('./email-service-s3');
const { testS3Connection } = require('./s3-service');

// Premium features
const db = require('./database');
const premiumRoutes = require('./premium-routes');
const stripeService = require('./stripe-service');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://bibleops.com', 'https://www.bibleops.com']
        : '*',
    credentials: true
}));
app.use(bodyParser.json());

// Serve public files (free tier)
app.use(express.static(path.join(__dirname, '../public')));

// Serve premium files
app.use('/premium', express.static(path.join(__dirname, '../premium-public')));

// Store generation status
const generationStatus = new Map();

// Track active background jobs
const activeJobs = new Set();

// Shutdown flag
let isShuttingDown = false;

// API Routes

// Mount premium routes
app.use('/api/premium', premiumRoutes);

// Stripe webhook (must be before bodyParser middleware for raw body)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured, skipping webhook verification');
        return res.status(400).send('Webhook secret not configured');
    }

    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

        // Handle the event
        await stripeService.handleWebhook(event);

        res.json({ received: true });
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

/**
 * POST /api/generate
 * Generate complete Bible study curriculum based on form data
 * NOW ASYNC: Returns immediately, processes in background, sends email when done
 */
app.post('/api/generate', async (req, res) => {
    try {
        // Reject new requests if server is shutting down
        if (isShuttingDown) {
            return res.status(503).json({
                error: 'Server is shutting down for maintenance',
                message: 'Please try again in a few moments',
                retryAfter: 60
            });
        }

        console.log('📖 Received Bible study generation request');
        console.log('Form Data:', JSON.stringify(req.body, null, 2));

        const formData = req.body;

        // Validate required fields
        if (!formData.email) {
            return res.status(400).json({
                error: 'Email address is required'
            });
        }

        // FREE TIER TRACKING: Check usage limits
        try {
            // Get or create free user
            let user = await db.getUserByEmail(formData.email);

            if (!user) {
                // Create new free user
                user = await db.createFreeUser(formData.email);
                console.log(`🆕 Created new free user: ${formData.email}`);
            }

            // Check free tier limits (only for free users)
            if (user.tier === 'free') {
                const freeUsageCount = await db.getFreeUsageCount(user.id);
                console.log(`📊 Free tier usage for ${formData.email}: ${freeUsageCount}/3`);

                if (freeUsageCount >= 3) {
                    return res.status(403).json({
                        error: 'Free tier limit reached',
                        message: 'You\'ve used your 3 free Bible study curricula. Upgrade to Premium for 25 per month at just $19.97!',
                        usageCount: freeUsageCount,
                        limit: 3,
                        upgradeUrl: '/premium/signup.html?email=' + encodeURIComponent(formData.email),
                        tier: 'free'
                    });
                }
            }

            // Store user ID for later tracking
            formData.userId = user.id;
            formData.userTier = user.tier;

        } catch (dbError) {
            console.error('⚠️ Database error (non-blocking):', dbError);
            // Continue with generation even if database tracking fails
            // This ensures existing users aren't blocked if database is down
        }

        // Validate study focus requirements
        if (formData.studyFocus === 'book') {
            // Book studies require title and author, passage is optional
            if (!formData.bookTitle || !formData.bookAuthor) {
                return res.status(400).json({
                    error: 'Book studies require book title and author'
                });
            }
        } else if (!formData.passage && !formData.theme) {
            return res.status(400).json({
                error: 'Please specify either a Bible passage or a theme for study'
            });
        }

        if (!formData.denomination) {
            return res.status(400).json({
                error: 'Please select your denomination'
            });
        }

        if (!formData.bibleVersion) {
            return res.status(400).json({
                error: 'Please select your preferred Bible version'
            });
        }

        if (!formData.ageGroup) {
            return res.status(400).json({
                error: 'Please select the age group for this study'
            });
        }

        // Generate unique job ID
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        console.log(`✅ Request validated. Job ID: ${jobId}`);
        console.log(`📧 Will email results to: ${formData.email}`);

        // Return immediately - processing will happen in background
        res.json({
            success: true,
            jobId: jobId,
            message: 'Your Bible study curriculum is being generated. You will receive an email shortly.',
            email: formData.email,
            estimatedTime: formData.studyFocus === 'book' ? '8-12 minutes' : '6-10 minutes'
        });

        // Track this job as active
        activeJobs.add(jobId);

        // Process generation in background (don't await)
        processGenerationInBackground(jobId, formData)
            .finally(() => {
                // Remove from active jobs when done
                activeJobs.delete(jobId);
            });

    } catch (error) {
        console.error('❌ Error validating request:', error);
        res.status(500).json({
            error: 'Failed to process request',
            message: error.message
        });
    }
});

/**
 * Background processing function
 * Generates curriculum and sends email without blocking the API response
 */
async function processGenerationInBackground(jobId, formData) {
    try {
        console.log(`\n🚀 [${jobId}] Starting background generation...`);

        // Update status
        generationStatus.set(jobId, {
            status: 'generating',
            startTime: new Date(),
            email: formData.email
        });

        // Generate Bible study curriculum (this will take 6-10 minutes)
        console.log(`🤖 [${jobId}] Starting AI generation of 14 specialized agents...`);
        const result = await generateBibleStudy(formData);

        console.log(`✅ [${jobId}] Bible study generation complete!`);

        // Update status
        generationStatus.set(jobId, {
            status: 'sending_email',
            startTime: generationStatus.get(jobId).startTime,
            email: formData.email
        });

        // Send email with PDFs
        try {
            console.log(`📧 [${jobId}] Preparing to send curriculum email...`);

            // Collect all PDFs from result
            const pdfFiles = [];
            const pdfKeys = [
                'bookResearch', 'foundation', 'bibleVersion', 'theology', 'biblicalContext',
                'hermeneutics', 'originalLanguages', 'crossReference',
                'application', 'smallGroup', 'prayer', 'teachingMethods',
                'studentGuide', 'leaderGuide'
            ];

            for (const key of pdfKeys) {
                if (result[key] && result[key].filename) {
                    const pdfPath = path.join(__dirname, '../generated-pdfs', result[key].filename);

                    if (fs.existsSync(pdfPath)) {
                        const buffer = fs.readFileSync(pdfPath);
                        pdfFiles.push({
                            name: result[key].filename,
                            title: result[key].title,
                            path: pdfPath,
                            buffer: buffer
                        });
                    }
                }
            }

            console.log(`📦 [${jobId}] Found ${pdfFiles.length} PDFs to send`);

            // Send email with S3 download links
            const emailResult = await sendCurriculumEmailWithLinks({
                toEmail: formData.email,
                passage: formData.passage,
                theme: formData.theme,
                bookTitle: formData.bookTitle,
                pdfs: pdfFiles,
                groupSize: formData.groupSize
            });

            console.log(`✅ [${jobId}] Email sent successfully to ${formData.email}!`);

            // Track generation in database (free tier)
            if (formData.userId) {
                try {
                    await db.createGeneration({
                        userId: formData.userId,
                        jobId: jobId,
                        studyFocus: formData.studyFocus,
                        passage: formData.passage || null,
                        theme: formData.theme || null,
                        bookTitle: formData.bookTitle || null,
                        bookAuthor: formData.bookAuthor || null,
                        denomination: formData.denomination,
                        bibleVersion: formData.bibleVersion,
                        ageGroup: formData.ageGroup,
                        tierAtGeneration: formData.userTier || 'free',
                        billingPeriodStart: null, // Free tier doesn't have billing periods
                        billingPeriodEnd: null,
                        isOverage: false,
                        overageChargeAmount: null,
                        status: 'completed'
                    });
                    console.log(`📊 [${jobId}] Generation tracked in database`);
                } catch (dbError) {
                    console.error(`⚠️ [${jobId}] Failed to track generation in database:`, dbError);
                    // Don't fail the generation if database tracking fails
                }
            }

            // Update final status
            generationStatus.set(jobId, {
                status: 'completed',
                startTime: generationStatus.get(jobId).startTime,
                completedTime: new Date(),
                email: formData.email,
                emailSent: true
            });

        } catch (emailError) {
            console.error(`❌ [${jobId}] Failed to send email:`, emailError);

            // Update status with error
            generationStatus.set(jobId, {
                status: 'email_failed',
                startTime: generationStatus.get(jobId).startTime,
                completedTime: new Date(),
                email: formData.email,
                emailSent: false,
                error: emailError.message
            });
        }

    } catch (error) {
        console.error(`❌ [${jobId}] Error in background generation:`, error);

        // Update status with error
        generationStatus.set(jobId, {
            status: 'failed',
            startTime: generationStatus.get(jobId)?.startTime || new Date(),
            completedTime: new Date(),
            email: formData.email,
            error: error.message
        });
    }
}

/**
 * GET /api/download/:filename
 * Download generated PDF
 */
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../generated-pdfs', filename);

    console.log(`📥 Download request for: ${filename}`);

    res.download(filePath, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(404).json({ error: 'File not found' });
        }
    });
});

/**
 * GET /api/status/:jobId
 * Check generation status for async processing
 * Returns: { status: 'generating' | 'sending_email' | 'completed' | 'failed' | 'not_found', ... }
 */
app.get('/api/status/:id', (req, res) => {
    const id = req.params.id;
    const status = generationStatus.get(id) || { status: 'not_found' };
    res.json(status);
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: isShuttingDown ? 'shutting_down' : 'healthy',
        timestamp: new Date().toISOString(),
        anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
        emailConfigured: !!process.env.MAILCHIMP_API_KEY,
        s3Configured: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
        databaseConfigured: !!process.env.DATABASE_URL,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        emailService: 'mailchimp-with-s3-links',
        agents: 14,
        components: 'Book Research (optional), 11 Bible Study Agents, Student Guide, Leader Guide',
        activeJobs: activeJobs.size,
        isShuttingDown: isShuttingDown,
        premiumEnabled: !!process.env.DATABASE_URL && !!process.env.STRIPE_SECRET_KEY,
        freeTierLimit: '3 curricula per 45 days'
    });
});

/**
 * Test email connection
 */
app.get('/api/test-email', async (req, res) => {
    try {
        const isConnected = await testConnection();
        res.json({
            success: isConnected,
            message: isConnected ? 'Email service connected successfully' : 'Email service connection failed',
            service: 'Mailchimp Transactional'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Email service test failed',
            error: error.message
        });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// Start server
app.listen(PORT, async () => {
    const premiumEnabled = !!(process.env.DATABASE_URL && process.env.STRIPE_SECRET_KEY);

    console.log(`
📖 Bible Study Curriculum Generator Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server running on: http://localhost:${PORT}
🌐 Open in browser:   http://localhost:${PORT}

🔑 Anthropic API:     ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'}
📧 Email Service:     ${process.env.MAILCHIMP_API_KEY ? '✅ Configured (Mailchimp)' : '❌ Not configured'}
☁️  AWS S3:           ${process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? '✅ Configured' : '❌ Not configured'}
🗄️  PostgreSQL:       ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Not configured'}
💳 Stripe:            ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Not configured'}
🤖 AI Agents:         14 specialized agents (Book Research + 11 Bible Study + 2 Guides)

${premiumEnabled ? '💎 PREMIUM SYSTEM:    ✅ Enabled\n   Free Tier:         3 curricula per 45 days\n   Premium:           $19.97/month for 25 curricula\n   Premium Portal:    http://localhost:' + PORT + '/premium\n' : ''}✝️  Ready to generate transformative Bible studies!
Press Ctrl+C to stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    // Test S3 connection on startup
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        await testS3Connection();
    }

    // Test database connection on startup
    if (process.env.DATABASE_URL) {
        try {
            await db.testConnection();
        } catch (error) {
            console.error('⚠️ Database connection failed:', error.message);
        }
    }
});

// Graceful shutdown - wait for active jobs to complete
process.on('SIGTERM', async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('🛑 SIGTERM received, checking for active jobs...');

    if (activeJobs.size === 0) {
        console.log('✅ No active jobs, shutting down immediately');
        process.exit(0);
    }

    console.log(`⏳ Waiting for ${activeJobs.size} active job(s) to complete: ${Array.from(activeJobs).join(', ')}`);
    console.log('   This may take 5-10 minutes. Server will remain available for new requests.');

    // Wait for all active jobs to complete (max 15 minutes)
    const maxWaitTime = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;

        if (activeJobs.size === 0) {
            console.log('✅ All jobs completed, shutting down gracefully');
            clearInterval(checkInterval);
            process.exit(0);
        } else if (elapsedTime >= maxWaitTime) {
            console.log(`⚠️ Timeout reached (15 minutes), forcing shutdown with ${activeJobs.size} jobs still running`);
            clearInterval(checkInterval);
            process.exit(0);
        } else {
            const remainingJobs = Array.from(activeJobs);
            const timeRemaining = Math.round((maxWaitTime - elapsedTime) / 1000 / 60);
            console.log(`⏳ Still waiting for ${activeJobs.size} job(s): ${remainingJobs.slice(0, 3).join(', ')}${remainingJobs.length > 3 ? '...' : ''} (${timeRemaining} min remaining)`);
        }
    }, 30000); // Check every 30 seconds
});

module.exports = app;
