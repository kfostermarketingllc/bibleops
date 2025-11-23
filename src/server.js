const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { generateBibleStudy } = require('./bible-study-generator');
const { sendCurriculumEmail, testConnection } = require('./email-service');

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
app.use(express.static(path.join(__dirname, '../public')));

// Store generation status
const generationStatus = new Map();

// API Routes

/**
 * POST /api/generate
 * Generate complete Bible study curriculum based on form data
 */
app.post('/api/generate', async (req, res) => {
    try {
        console.log('📖 Received Bible study generation request');
        console.log('Form Data:', JSON.stringify(req.body, null, 2));

        const formData = req.body;

        // Validate required fields
        if (!formData.email) {
            return res.status(400).json({
                error: 'Email address is required'
            });
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

        // Generate Bible study curriculum (this will take 5-8 minutes)
        console.log('🤖 Starting AI generation of 11 specialized agents...');
        const result = await generateBibleStudy(formData);

        console.log('✅ Bible study generation complete!');

        // Send email with PDFs
        try {
            console.log('📧 Preparing to send curriculum email...');

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

            console.log(`📦 Found ${pdfFiles.length} PDFs to send`);

            // Send email
            const emailResult = await sendCurriculumEmail({
                toEmail: formData.email,
                passage: formData.passage,
                theme: formData.theme,
                pdfs: pdfFiles
            });

            console.log('✅ Email sent successfully!');
            result.emailSent = true;
            result.emailStatus = emailResult;

        } catch (emailError) {
            console.error('❌ Failed to send email:', emailError);
            result.emailSent = false;
            result.emailError = emailError.message;
            // Don't fail the whole request if email fails
        }

        res.json(result);

    } catch (error) {
        console.error('❌ Error generating Bible study:', error);
        res.status(500).json({
            error: 'Failed to generate Bible study curriculum',
            message: error.message
        });
    }
});

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
 * GET /api/status/:id
 * Check generation status (for future async implementation)
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
        status: 'healthy',
        timestamp: new Date().toISOString(),
        anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
        emailConfigured: !!process.env.MAILCHIMP_API_KEY,
        emailService: process.env.EMAIL_SERVICE || 'mailchimp',
        agents: 14,
        components: 'Book Research (optional), 11 Bible Study Agents, Student Guide, Leader Guide'
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
app.listen(PORT, () => {
    console.log(`
📖 Bible Study Curriculum Generator Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server running on: http://localhost:${PORT}
🌐 Open in browser:   http://localhost:${PORT}

🔑 Anthropic API:     ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'}
📧 Email Service:     ${process.env.MAILCHIMP_API_KEY ? '✅ Configured (Mailchimp)' : '❌ Not configured'}
🤖 AI Agents:         14 specialized agents (Book Research + 11 Bible Study + 2 Guides)

✝️  Ready to generate transformative Bible studies!
Press Ctrl+C to stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
