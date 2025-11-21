const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional PDF document from content
 */
async function generatePDF(content, title, filename, context) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'LETTER',
                margins: {
                    top: 72,
                    bottom: 72,
                    left: 72,
                    right: 72
                }
            });

            const outputPath = path.join(__dirname, '../generated-pdfs', filename);
            const writeStream = fs.createWriteStream(outputPath);

            doc.pipe(writeStream);

            // Header
            addHeader(doc, title, context);

            // Add spacing
            doc.moveDown(2);

            // Content
            addContent(doc, content);

            // Footer on all pages
            addFooter(doc, context);

            // Finalize PDF
            doc.end();

            writeStream.on('finish', () => {
                const stats = fs.statSync(outputPath);
                resolve({
                    filename: filename,
                    path: `/api/download/${filename}`,
                    title: title,
                    size: stats.size,
                    pages: doc.bufferedPageRange().count
                });
            });

            writeStream.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add header to PDF
 */
function addHeader(doc, title, context) {
    // Title
    doc.fontSize(20)
        .font('Helvetica-Bold')
        .text(title, { align: 'center' });

    doc.moveDown(0.5);

    // Study info
    doc.fontSize(10)
        .font('Helvetica')
        .text(`Bible Study: ${context.passage || context.theme}`, { align: 'center' });

    doc.fontSize(9)
        .text(`${context.denomination} | ${context.bibleVersion} | ${context.ageGroup}`, { align: 'center' });

    // Horizontal line
    doc.moveDown(0.5);
    const lineY = doc.y;
    doc.moveTo(72, lineY)
        .lineTo(540, lineY)
        .stroke();
}

/**
 * Add content to PDF with formatting
 */
function addContent(doc, content) {
    const lines = content.split('\n');
    let currentFontSize = 11;
    let currentFont = 'Helvetica';

    for (let line of lines) {
        // Check if we need a new page
        if (doc.y > 700) {
            doc.addPage();
        }

        // Detect markdown-style headers and format accordingly
        if (line.startsWith('# ')) {
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .text(line.substring(2), { continued: false });
            doc.moveDown(0.5);
            currentFont = 'Helvetica';
            currentFontSize = 11;
        } else if (line.startsWith('## ')) {
            doc.moveDown(0.3);
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .text(line.substring(3), { continued: false });
            doc.moveDown(0.3);
            currentFont = 'Helvetica';
            currentFontSize = 11;
        } else if (line.startsWith('### ')) {
            doc.moveDown(0.2);
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text(line.substring(4), { continued: false });
            doc.moveDown(0.2);
            currentFont = 'Helvetica';
            currentFontSize = 11;
        } else if (line.startsWith('**') && line.endsWith('**')) {
            // Bold text
            doc.fontSize(currentFontSize)
                .font('Helvetica-Bold')
                .text(line.replace(/\*\*/g, ''), { continued: false });
            currentFont = 'Helvetica';
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            // Bullet point
            doc.fontSize(currentFontSize)
                .font(currentFont)
                .text('  • ' + line.substring(2), {
                    continued: false,
                    indent: 10
                });
        } else if (line.trim() === '') {
            // Empty line - add spacing
            doc.moveDown(0.5);
        } else if (line.match(/^\d+\./)) {
            // Numbered list
            doc.fontSize(currentFontSize)
                .font(currentFont)
                .text(line, {
                    continued: false,
                    indent: 10
                });
        } else {
            // Regular paragraph
            doc.fontSize(currentFontSize)
                .font(currentFont)
                .text(line, {
                    align: 'left',
                    continued: false
                });
        }
    }
}

/**
 * Add footer to all pages
 */
function addFooter(doc, context) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);

        // Footer text
        const bottomY = 720;
        doc.fontSize(8)
            .font('Helvetica')
            .text(
                `Generated by Bible Study Curriculum Generator | ${new Date().toLocaleDateString()}`,
                72,
                bottomY,
                {
                    align: 'center',
                    width: 468
                }
            );

        // Page number
        doc.text(
            `Page ${i + 1} of ${range.count}`,
            72,
            bottomY + 12,
            {
                align: 'center',
                width: 468
            }
        );
    }
}

module.exports = {
    generatePDF
};
