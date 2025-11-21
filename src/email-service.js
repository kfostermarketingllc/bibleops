/**
 * Email Service - Mailchimp Transactional (Mandrill)
 * Handles sending Bible study curriculum PDFs to users
 */

const mailchimp = require('@mailchimp/mailchimp_transactional')(process.env.MAILCHIMP_API_KEY);

/**
 * Send Bible study curriculum email with PDF attachments
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.passage - Bible passage studied
 * @param {Array} params.pdfs - Array of PDF file objects {name, path, buffer}
 * @returns {Promise} - Mailchimp response
 */
async function sendCurriculumEmail({ toEmail, passage, theme, pdfs = [], baseUrl = 'https://bibleops.onrender.com' }) {
    try {
        console.log(`📧 Sending curriculum email to: ${toEmail}`);

        const studyFocus = passage || theme || 'Bible Study';

        // Prepare attachments as backup
        const attachments = pdfs.map(pdf => ({
            type: 'application/pdf',
            name: pdf.name,
            content: pdf.buffer.toString('base64')
        }));

        // Create HTML email content
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Merriweather', Georgia, serif;
            line-height: 1.6;
            color: #1a2332;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #1a2332;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .brand {
            font-size: 2rem;
            font-weight: 900;
            color: #1a2332;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }
        .tagline {
            font-size: 0.9rem;
            color: #4a5568;
            font-style: italic;
        }
        .content {
            padding: 20px 0;
        }
        .highlight {
            background: #f7fafc;
            border-left: 4px solid #2c5282;
            padding: 15px;
            margin: 20px 0;
        }
        .pdf-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .pdf-item {
            background: white;
            border: 1px solid #cbd5e0;
            padding: 12px 15px;
            margin: 8px 0;
            border-radius: 4px;
        }
        .pdf-icon {
            display: inline-block;
            margin-right: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #cbd5e0;
            text-align: center;
            font-size: 0.85rem;
            color: #718096;
        }
        .button {
            display: inline-block;
            background: #2c5282;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">BIBLEOPS</div>
        <div class="tagline">Build Your Bible Study Curriculum</div>
    </div>

    <div class="content">
        <h2>Your Bible Study Curriculum is Ready!</h2>

        <p>Thank you for using BibleOps. Your comprehensive Bible study curriculum for <strong>${studyFocus}</strong> has been generated and is ready for you.</p>

        <div class="highlight">
            <p><strong>📖 Study Focus:</strong> ${studyFocus}</p>
            <p><strong>📦 Included Materials:</strong> ${pdfs.length} specialized study guides</p>
            <p><strong>⏱️ Generation:</strong> Powered by advanced AI technology</p>
        </div>

        <h3>Your Curriculum (Attached):</h3>
        <ul class="pdf-list">
            ${pdfs.map(pdf => `
                <li class="pdf-item">
                    <span class="pdf-icon">📄</span>
                    <strong>${pdf.title}</strong>
                </li>
            `).join('')}
        </ul>

        <p style="background: #f7fafc; padding: 15px; border-left: 4px solid #48bb78; margin: 20px 0;">
            <strong>📎 All ${pdfs.length} PDFs are attached to this email</strong> - Download them from your email attachments.
        </p>

        <h3>How to Use These Materials:</h3>
        <ol>
            <li><strong>Download PDFs:</strong> Save the attached files from this email</li>
            <li><strong>Review the Overview:</strong> Start with the Foundational Materials guide</li>
            <li><strong>Prepare Your Teaching:</strong> Use the specialized guides for deep study</li>
            <li><strong>Engage Your Group:</strong> Utilize discussion questions and activities</li>
        </ol>

        <div class="highlight">
            <p><strong>💡 Pro Tip:</strong> Print the materials or save them to a tablet for easy reference during your study sessions.</p>
        </div>

        <p style="text-align: center; margin-top: 30px;">
            <a href="https://bibleops.com" class="button">Build Another Study</a>
        </p>
    </div>

    <div class="footer">
        <p><strong>BibleOps</strong> - Comprehensive curriculum creation with precision and theological care</p>
        <p>Powered by Advanced AI Technology</p>
        <p style="margin-top: 15px; font-size: 0.75rem;">
            Built on proven methodologies from Gordon Fee, Douglas Stuart, Rick Warren, Jen Wilkin, and more
        </p>
        <p style="margin-top: 10px;">
            <a href="https://bibleops.com" style="color: #2c5282;">bibleops.com</a>
        </p>
    </div>
</body>
</html>
        `;

        // Plain text version
        const textContent = `
BIBLEOPS - Build Your Bible Study Curriculum

Your Bible Study Curriculum is Ready!

Thank you for using BibleOps. Your comprehensive Bible study curriculum for ${studyFocus} has been generated.

Study Focus: ${studyFocus}
Included Materials: ${pdfs.length} specialized study guides

Your Curriculum (Attached):
${pdfs.map((pdf, i) => `${i + 1}. ${pdf.title}`).join('\n')}

All ${pdfs.length} PDFs are attached to this email - Download them from your email attachments.

How to Use These Materials:
1. Download PDFs: Save the attached files from this email
2. Review the Overview: Start with the Foundational Materials guide
3. Prepare Your Teaching: Use the specialized guides for deep study
4. Engage Your Group: Utilize discussion questions and activities

Build another study at: https://bibleops.com

---
BibleOps - Comprehensive curriculum creation with precision and theological care
Powered by Advanced AI Technology
bibleops.com
        `;

        // Send email via Mailchimp Transactional
        const message = {
            from_email: process.env.MAILCHIMP_FROM_EMAIL || 'noreply@bibleops.com',
            from_name: process.env.MAILCHIMP_FROM_NAME || 'BibleOps',
            subject: `Your ${studyFocus} Bible Study Curriculum - ${pdfs.length} PDFs Attached`,
            text: textContent,
            html: htmlContent,
            to: [
                {
                    email: toEmail,
                    type: 'to'
                }
            ],
            attachments: attachments,
            tags: ['bible-study', 'curriculum'],
            metadata: {
                study_focus: studyFocus,
                pdf_count: pdfs.length.toString()
            }
        };

        const response = await mailchimp.messages.send({ message });

        console.log(`✅ Email sent successfully to ${toEmail}`);
        console.log('Mailchimp Response:', response);

        return {
            success: true,
            messageId: response[0]._id,
            status: response[0].status
        };

    } catch (error) {
        console.error('❌ Error sending email:', error);

        // Return detailed error
        throw new Error(`Email delivery failed: ${error.message}`);
    }
}

/**
 * Test email connection
 * @returns {Promise<boolean>} - True if connection successful
 */
async function testConnection() {
    try {
        const response = await mailchimp.users.ping();
        console.log('✅ Mailchimp connection successful:', response);
        return true;
    } catch (error) {
        console.error('❌ Mailchimp connection failed:', error);
        return false;
    }
}

module.exports = {
    sendCurriculumEmail,
    testConnection
};
