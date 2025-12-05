const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Brand colors
const BRAND_COLORS = {
    primary: '#2C5530',      // Deep forest green
    secondary: '#4A7C59',    // Lighter green
    accent: '#8B4513',       // Warm brown
    text: '#333333',         // Dark gray for body text
    lightGray: '#666666',    // For secondary text
    border: '#CCCCCC',       // For lines
    answerLine: '#AAAAAA'    // For answer lines
};

// Number of answer lines to add after questions
const ANSWER_LINES_COUNT = 8;
const ANSWER_LINE_HEIGHT = 22; // pixels between lines

/**
 * Generate a professional PDF document from content
 */
async function generatePDF(content, title, filename, context) {
    return new Promise((resolve, reject) => {
        try {
            // Ensure generated-pdfs directory exists
            const outputDir = path.join(__dirname, '../generated-pdfs');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const doc = new PDFDocument({
                size: 'LETTER',
                margins: {
                    top: 90,
                    bottom: 90,
                    left: 72,
                    right: 72
                },
                bufferPages: true
            });

            const outputPath = path.join(outputDir, filename);
            const writeStream = fs.createWriteStream(outputPath);

            doc.pipe(writeStream);

            // Clean the content before processing
            const cleanedContent = cleanMarkdownContent(content);

            // Header
            addHeader(doc, title, context);

            // Add spacing
            doc.moveDown(1.5);

            // Content
            addContent(doc, cleanedContent);

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
 * Clean markdown artifacts from AI-generated content
 */
function cleanMarkdownContent(content) {
    let cleaned = content;

    // Remove horizontal rules (---, ***, ___)
    cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');

    // Remove excessive asterisks used for emphasis markers (but keep content)
    // Handle ***bold italic*** -> content
    cleaned = cleaned.replace(/\*{3}([^*]+)\*{3}/g, '$1');

    // Handle **bold** -> content (will be styled by addContent)
    // Keep these for now as addContent handles them

    // Handle *italic* -> content
    cleaned = cleaned.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');

    // Remove code blocks markers
    cleaned = cleaned.replace(/```[\w]*\n?/g, '');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // Clean up excessive blank lines (more than 2 in a row)
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

    // Remove leading/trailing whitespace from lines
    cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

    // Remove any standalone hash symbols that aren't headers
    cleaned = cleaned.replace(/^#+\s*$/gm, '');

    return cleaned;
}

/**
 * Add header to PDF with BibleOps branding
 */
function addHeader(doc, title, context) {
    const pageWidth = doc.page.width;
    const marginLeft = 72;
    const marginRight = 72;
    const contentWidth = pageWidth - marginLeft - marginRight;

    // BibleOps Logo/Brand Name
    doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(BRAND_COLORS.primary)
        .text('BibleOps', marginLeft, 40, { align: 'left' });

    // Tagline
    doc.fontSize(8)
        .font('Helvetica')
        .fillColor(BRAND_COLORS.lightGray)
        .text('Bible Study Curriculum', marginLeft, 56, { align: 'left' });

    // Decorative line under brand
    doc.moveTo(marginLeft, 72)
        .lineTo(pageWidth - marginRight, 72)
        .strokeColor(BRAND_COLORS.primary)
        .lineWidth(2)
        .stroke();

    // Reset position for main content
    doc.y = 90;

    // Document Title
    doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor(BRAND_COLORS.primary)
        .text(title, { align: 'center' });

    doc.moveDown(0.5);

    // Study Focus
    const studyFocus = context.passage || context.theme || 'Bible Study';
    doc.fontSize(12)
        .font('Helvetica')
        .fillColor(BRAND_COLORS.text)
        .text(studyFocus, { align: 'center' });

    doc.moveDown(0.3);

    // Study Details (denomination, version, audience)
    const details = [
        context.denomination,
        context.bibleVersion,
        context.ageGroup
    ].filter(Boolean).join('  •  ');

    doc.fontSize(10)
        .fillColor(BRAND_COLORS.lightGray)
        .text(details, { align: 'center' });

    // Decorative divider
    doc.moveDown(0.8);
    const dividerY = doc.y;
    const dividerWidth = 150;
    const dividerStart = (pageWidth - dividerWidth) / 2;

    doc.moveTo(dividerStart, dividerY)
        .lineTo(dividerStart + dividerWidth, dividerY)
        .strokeColor(BRAND_COLORS.secondary)
        .lineWidth(1)
        .stroke();

    // Reset text color for content
    doc.fillColor(BRAND_COLORS.text);
}

/**
 * Add content to PDF with professional formatting
 */
function addContent(doc, content) {
    const lines = content.split('\n');
    const marginLeft = 72;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - marginLeft - 72;

    // Track list state for proper spacing
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Check if we need a new page (leave room for footer)
        if (doc.y > 680) {
            doc.addPage();
            // Add simple header on continuation pages
            doc.fontSize(10)
                .font('Helvetica')
                .fillColor(BRAND_COLORS.lightGray)
                .text('BibleOps', marginLeft, 50);
            doc.moveTo(marginLeft, 65)
                .lineTo(pageWidth - 72, 65)
                .strokeColor(BRAND_COLORS.border)
                .lineWidth(0.5)
                .stroke();
            doc.y = 85;
            doc.fillColor(BRAND_COLORS.text);
        }

        // Parse headers (# ## ### ####)
        const h1Match = line.match(/^#\s+(.+)$/);
        const h2Match = line.match(/^##\s+(.+)$/);
        const h3Match = line.match(/^###\s+(.+)$/);
        const h4Match = line.match(/^####\s+(.+)$/);

        if (h1Match) {
            inList = false;
            doc.moveDown(1);
            doc.fontSize(18)
                .font('Helvetica-Bold')
                .fillColor(BRAND_COLORS.primary)
                .text(cleanText(h1Match[1]), { align: 'left' });
            doc.moveDown(0.5);
            doc.fillColor(BRAND_COLORS.text);
        } else if (h2Match) {
            inList = false;
            doc.moveDown(0.8);
            doc.fontSize(15)
                .font('Helvetica-Bold')
                .fillColor(BRAND_COLORS.secondary)
                .text(cleanText(h2Match[1]), { align: 'left' });
            doc.moveDown(0.4);
            doc.fillColor(BRAND_COLORS.text);
        } else if (h3Match) {
            inList = false;
            doc.moveDown(0.6);
            doc.fontSize(13)
                .font('Helvetica-Bold')
                .fillColor(BRAND_COLORS.text)
                .text(cleanText(h3Match[1]), { align: 'left' });
            doc.moveDown(0.3);
        } else if (h4Match) {
            inList = false;
            doc.moveDown(0.4);
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .fillColor(BRAND_COLORS.text)
                .text(cleanText(h4Match[1]), { align: 'left' });
            doc.moveDown(0.2);
        } else if (line.match(/^[-*]\s+/)) {
            // Bullet point
            if (!inList) {
                doc.moveDown(0.3);
                inList = true;
            }
            const bulletContent = cleanText(line.replace(/^[-*]\s+/, ''));

            doc.fontSize(11)
                .font('Helvetica')
                .fillColor(BRAND_COLORS.text);

            doc.text('•  ' + bulletContent, marginLeft + 15, doc.y, {
                width: contentWidth - 15,
                align: 'left',
                indent: 12
            });

            // Add answer lines if this is a question
            if (isQuestion(bulletContent)) {
                addAnswerLines(doc, marginLeft, contentWidth);
            }
        } else if (line.match(/^\d+\.\s+/)) {
            // Numbered list
            if (!inList) {
                doc.moveDown(0.3);
                inList = true;
            }
            const numberMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (numberMatch) {
                const number = numberMatch[1];
                const listContent = cleanText(numberMatch[2]);

                doc.fontSize(11)
                    .font('Helvetica')
                    .fillColor(BRAND_COLORS.text)
                    .text(`${number}. ${listContent}`, marginLeft + 15, doc.y, {
                        width: contentWidth - 15,
                        align: 'left',
                        indent: 18
                    });

                // Add answer lines if this is a question
                if (isQuestion(listContent)) {
                    addAnswerLines(doc, marginLeft, contentWidth);
                }
            }
        } else if (line.trim() === '') {
            // Empty line
            inList = false;
            doc.moveDown(0.4);
        } else {
            // Regular paragraph - check if it's a standalone bold line
            inList = false;
            const cleanedLine = cleanText(line.trim());

            if (cleanedLine) {
                doc.fontSize(11)
                    .font('Helvetica')
                    .fillColor(BRAND_COLORS.text)
                    .text(cleanedLine, marginLeft, doc.y, {
                        width: contentWidth,
                        align: 'left'
                    });
                doc.moveDown(0.2);

                // Add answer lines if this is a question
                if (isQuestion(cleanedLine)) {
                    addAnswerLines(doc, marginLeft, contentWidth);
                }
            }
        }
    }
}

/**
 * Check if a line is a question (ends with ?)
 */
function isQuestion(text) {
    if (!text) return false;
    const cleaned = text.trim();
    return cleaned.endsWith('?');
}

/**
 * Add answer lines below a question for writing responses
 */
function addAnswerLines(doc, marginLeft, contentWidth, lineCount = ANSWER_LINES_COUNT) {
    const startY = doc.y + 8; // Small gap after question

    for (let i = 0; i < lineCount; i++) {
        const lineY = startY + (i * ANSWER_LINE_HEIGHT);

        // Check if we need a new page
        if (lineY > 680) {
            doc.addPage();
            // Add simple header on continuation pages
            doc.fontSize(10)
                .font('Helvetica')
                .fillColor(BRAND_COLORS.lightGray)
                .text('BibleOps', marginLeft, 50);
            doc.moveTo(marginLeft, 65)
                .lineTo(doc.page.width - 72, 65)
                .strokeColor(BRAND_COLORS.border)
                .lineWidth(0.5)
                .stroke();
            doc.y = 85;
            doc.fillColor(BRAND_COLORS.text);

            // Recalculate remaining lines on new page
            const remainingLines = lineCount - i;
            addAnswerLines(doc, marginLeft, contentWidth, remainingLines);
            return;
        }

        // Draw the answer line
        doc.moveTo(marginLeft, lineY)
            .lineTo(marginLeft + contentWidth, lineY)
            .strokeColor(BRAND_COLORS.answerLine)
            .lineWidth(0.5)
            .stroke();
    }

    // Update doc.y to after the lines
    doc.y = startY + (lineCount * ANSWER_LINE_HEIGHT) + 10;
}

/**
 * Clean text by removing markdown artifacts
 */
function cleanText(text) {
    if (!text) return '';

    let cleaned = text;

    // Remove bold markers but keep content
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

    // Remove italic markers
    cleaned = cleaned.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');

    // Remove underscores used for emphasis
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_\n]+)_/g, '$1');

    // Remove any remaining stray asterisks
    cleaned = cleaned.replace(/\*+/g, '');

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * Add footer to all pages with BibleOps branding
 */
function addFooter(doc, context) {
    const range = doc.bufferedPageRange();
    const pageWidth = doc.page.width;
    const marginLeft = 72;
    const marginRight = 72;
    const contentWidth = pageWidth - marginLeft - marginRight;

    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);

        const bottomY = 730;

        // Decorative line above footer
        doc.moveTo(marginLeft, bottomY - 10)
            .lineTo(pageWidth - marginRight, bottomY - 10)
            .strokeColor(BRAND_COLORS.border)
            .lineWidth(0.5)
            .stroke();

        // BibleOps branding
        doc.fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(BRAND_COLORS.primary)
            .text('BibleOps', marginLeft, bottomY, {
                continued: true,
                width: contentWidth
            });

        doc.font('Helvetica')
            .fillColor(BRAND_COLORS.lightGray)
            .text(`  |  Generated ${new Date().toLocaleDateString()}`, {
                continued: false
            });

        // Page number on the right
        doc.fontSize(9)
            .font('Helvetica')
            .fillColor(BRAND_COLORS.lightGray)
            .text(
                `Page ${i + 1} of ${range.count}`,
                marginLeft,
                bottomY,
                {
                    align: 'right',
                    width: contentWidth
                }
            );

        // Website/copyright on second line
        doc.fontSize(7)
            .fillColor(BRAND_COLORS.lightGray)
            .text(
                'www.bibleops.com',
                marginLeft,
                bottomY + 14,
                {
                    align: 'center',
                    width: contentWidth
                }
            );
    }
}

module.exports = {
    generatePDF
};
