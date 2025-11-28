/**
 * Email Service with S3 Download Links
 * Sends download links instead of attachments (14-day expiration)
 */

const mailchimp = require('@mailchimp/mailchimp_transactional')(process.env.MAILCHIMP_API_KEY);
const { uploadAndGetDownloadUrl } = require('./s3-service');

/**
 * Upload PDFs to S3 and get download URLs
 * @param {Array} pdfs - Array of PDF file objects {name, title, path, buffer}
 * @returns {Promise<Array>} - Array of PDFs with download URLs
 */
async function uploadPDFsToS3(pdfs) {
    const uploadPromises = pdfs.map(async (pdf) => {
        try {
            const { downloadUrl, expiresAt } = await uploadAndGetDownloadUrl(pdf.path, pdf.name);
            return {
                ...pdf,
                downloadUrl,
                expiresAt
            };
        } catch (error) {
            console.error(`❌ Failed to upload ${pdf.name}:`, error);
            throw error;
        }
    });

    return await Promise.all(uploadPromises);
}

/**
 * Send Bible study curriculum email with S3 download links
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.passage - Bible passage studied
 * @param {string} params.theme - Study theme
 * @param {Array} params.pdfs - Array of PDF file objects {name, title, path, buffer}
 * @param {string} params.bookTitle - Book title (if book study)
 * @param {string} params.groupSize - Group size (if 'individual study', adjusts email content)
 * @returns {Promise} - Mailchimp response
 */
async function sendCurriculumEmailWithLinks({ toEmail, passage, theme, pdfs = [], bookTitle = null, groupSize = null }) {
    try {
        console.log(`📧 Preparing curriculum email with S3 links for: ${toEmail}`);
        console.log(`📦 Uploading ${pdfs.length} PDFs to S3...`);

        // Upload all PDFs to S3 and get download URLs
        const pdfsWithLinks = await uploadPDFsToS3(pdfs);
        console.log(`✅ All ${pdfs.length} PDFs uploaded to S3`);

        // Check if this is an individual study
        const isIndividualStudy = groupSize && groupSize.toLowerCase().includes('individual');

        const studyFocus = bookTitle || passage || theme || 'Bible Study';
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // 7 days (AWS maximum for presigned URLs)
        const formattedExpiration = expirationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create HTML email content with download links
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
            background-color: #f7fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            background: linear-gradient(135deg, #1a2332 0%, #2c5282 100%);
            color: white;
            padding: 30px 20px;
        }
        .brand {
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }
        .tagline {
            font-size: 0.9rem;
            opacity: 0.9;
            font-style: italic;
        }
        .content {
            padding: 30px;
        }
        .highlight {
            background: #f7fafc;
            border-left: 4px solid #2c5282;
            padding: 15px;
            margin: 20px 0;
        }
        .expiration-notice {
            background: #fff5f5;
            border-left: 4px solid #fc8181;
            padding: 15px;
            margin: 20px 0;
        }
        .pdf-downloads {
            margin: 30px 0;
        }
        .pdf-card {
            background: #f7fafc;
            border: 1px solid #cbd5e0;
            border-radius: 6px;
            padding: 15px;
            margin: 12px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .pdf-info {
            flex: 1;
        }
        .pdf-icon {
            font-size: 1.5rem;
            margin-right: 12px;
        }
        .pdf-title {
            font-weight: bold;
            color: #1a2332;
            margin-bottom: 4px;
        }
        .download-button {
            display: inline-block;
            background: #2c5282;
            color: white !important;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9rem;
            transition: background 0.3s;
        }
        .download-button:hover {
            background: #1a365d;
        }
        .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            font-size: 0.85rem;
            color: #718096;
        }
        .cta-button {
            display: inline-block;
            background: #48bb78;
            color: white !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
            font-size: 1rem;
        }
        h2 {
            color: #1a2332;
            border-bottom: 2px solid #cbd5e0;
            padding-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">BIBLEOPS</div>
            <div class="tagline">Build Your Bible Study Curriculum</div>
        </div>

        <div class="content">
            <h2>🎉 Your Bible Study Curriculum is Ready!</h2>

            <p>Thank you for using BibleOps. Your comprehensive Bible study curriculum for <strong>${studyFocus}</strong> has been generated by our 14 specialized AI agents.</p>

            <div class="highlight">
                <p><strong>📖 Study Focus:</strong> ${studyFocus}</p>
                <p><strong>📦 Materials Generated:</strong> ${pdfsWithLinks.length} specialized study guides</p>
                <p><strong>🤖 AI Agents:</strong> 14 specialized agents powered by Claude 3.7 Sonnet</p>
            </div>

            <div class="expiration-notice">
                <p><strong>⏰ Important:</strong> Download links expire on <strong>${formattedExpiration}</strong> (7 days)</p>
                <p style="margin-bottom: 0;">Please download all files within the next 7 days. After that, you'll need to generate a new curriculum.</p>
            </div>

            <h2>📥 Download Your Study Materials</h2>
            <p>Click the download button for each guide:</p>

            <div class="pdf-downloads">
                ${pdfsWithLinks.map(pdf => `
                    <div class="pdf-card">
                        <div style="display: flex; align-items: center; flex: 1;">
                            <span class="pdf-icon">📄</span>
                            <div class="pdf-info">
                                <div class="pdf-title">${pdf.title}</div>
                            </div>
                        </div>
                        <a href="${pdf.downloadUrl}" class="download-button" style="color: white;">Download</a>
                    </div>
                `).join('')}
            </div>

            <h2>📖 How to Use These Materials</h2>
            <ol style="line-height: 1.8;">
                <li><strong>Download All PDFs:</strong> Click each download button above to save all materials</li>
                <li><strong>Start with Foundational Materials:</strong> Review the overview and framework first</li>
                <li><strong>Explore Specialized Guides:</strong> Dive deep into context, theology, and application</li>
                ${isIndividualStudy
                    ? `<li><strong>Use Your Individual Study Guide:</strong> Your comprehensive personal study guide provides everything you need for self-paced learning</li>
                <li><strong>Follow the Personal Application:</strong> Work through reflection questions and journaling prompts at your own pace</li>`
                    : `<li><strong>Use the Study Guides:</strong> Student and Leader guides provide structured learning</li>
                <li><strong>Prepare Your Teaching:</strong> Leverage the teaching methods and discussion guides</li>`
                }
            </ol>

            <div class="highlight">
                <p><strong>💡 Pro Tip:</strong> Save all PDFs to a dedicated folder on your device for easy access during your study sessions.</p>
            </div>

            <div style="text-align: center; margin-top: 40px;">
                <a href="https://bibleops.com" class="cta-button" style="color: white;">Build Another Study</a>
            </div>
        </div>

        <div class="footer">
            <p><strong>BibleOps</strong> - Comprehensive curriculum creation with precision and theological care</p>
            <p>Powered by Advanced AI Technology (Claude 3.7 Sonnet)</p>
            <p style="margin-top: 15px; font-size: 0.75rem;">
                Built on proven methodologies from Gordon Fee, Douglas Stuart, Rick Warren, Jen Wilkin, and more
            </p>
            <p style="margin-top: 10px;">
                <a href="https://bibleops.com" style="color: #2c5282;">bibleops.com</a>
            </p>
        </div>
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
Materials Generated: ${pdfsWithLinks.length} specialized study guides
AI Agents: 14 specialized agents powered by Claude 3.7 Sonnet

⏰ IMPORTANT: Download links expire on ${formattedExpiration} (7 days)
Please download all files within the next 7 days.

📥 Download Your Study Materials:

${pdfsWithLinks.map((pdf, i) => `${i + 1}. ${pdf.title}\n   Download: ${pdf.downloadUrl}\n`).join('\n')}

📖 How to Use These Materials:
1. Download All PDFs: Use the links above to save all materials
2. Start with Foundational Materials: Review the overview and framework first
3. Explore Specialized Guides: Dive deep into context, theology, and application
${isIndividualStudy
    ? `4. Use Your Individual Study Guide: Your comprehensive personal study guide provides everything you need for self-paced learning
5. Follow the Personal Application: Work through reflection questions and journaling prompts at your own pace`
    : `4. Use the Study Guides: Student and Leader guides provide structured learning
5. Prepare Your Teaching: Leverage the teaching methods and discussion guides`
}

💡 Pro Tip: Save all PDFs to a dedicated folder on your device for easy access.

Build another study at: https://bibleops.com

---
BibleOps - Comprehensive curriculum creation with precision and theological care
Powered by Advanced AI Technology
bibleops.com
        `;

        // Send email via Mailchimp Transactional (no attachments!)
        const message = {
            from_email: process.env.MAILCHIMP_FROM_EMAIL || 'noreply@bibleops.com',
            from_name: process.env.MAILCHIMP_FROM_NAME || 'BibleOps',
            subject: `📖 Your ${studyFocus} Bible Study Curriculum - Ready to Download`,
            text: textContent,
            html: htmlContent,
            to: [
                {
                    email: toEmail,
                    type: 'to'
                }
            ],
            tags: ['bible-study', 'curriculum', 's3-links'],
            metadata: {
                study_focus: studyFocus,
                pdf_count: pdfsWithLinks.length.toString(),
                delivery_method: 's3-links',
                expires_at: expirationDate.toISOString()
            }
        };

        const response = await mailchimp.messages.send({ message });

        console.log(`✅ Email sent successfully to ${toEmail} with ${pdfsWithLinks.length} download links`);

        return {
            success: true,
            messageId: response[0]._id,
            status: response[0].status,
            downloadCount: pdfsWithLinks.length,
            expiresAt: expirationDate
        };

    } catch (error) {
        console.error('❌ Error sending email with S3 links:', error);
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
    sendCurriculumEmailWithLinks,
    testConnection
};
