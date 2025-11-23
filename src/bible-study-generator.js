const Anthropic = require('@anthropic-ai/sdk');
const { generatePDF } = require('./pdf-generator');
const AGENTS = require('../agents/agent-prompts');

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Main function to generate complete Bible study curriculum
 * Runs 11 specialized AI agents sequentially
 */
async function generateBibleStudy(formData) {
    console.log('\n🚀 Starting Bible Study Curriculum Generation...\n');

    const timestamp = Date.now();
    const results = {
        success: true,
        timestamp: new Date().toISOString(),
        email: formData.email,
        studyInfo: {
            focus: formData.studyFocus,
            passage: formData.passage,
            theme: formData.theme,
            denomination: formData.denomination,
            bibleVersion: formData.bibleVersion,
            ageGroup: formData.ageGroup,
            duration: formData.duration
        }
    };

    try {
        // Build context object for all agents
        const context = buildContext(formData);

        // Step 1: BOOK RESEARCH AGENT (if book study)
        let bookResearchContent = null;
        if (context.bookTitle) {
            console.log('📖 Agent 1/14: Book Research & Analysis Specialist');
            bookResearchContent = await callAgent(
                AGENTS.bookResearch,
                context,
                null
            );
            results.bookResearch = await generatePDF(
                bookResearchContent,
                'Book Research & Analysis',
                `book_research_${timestamp}.pdf`,
                context
            );
            console.log('✅ Book research complete\n');

            // Add book research to context for all subsequent agents
            context.bookResearchDocument = bookResearchContent;
        }

        // Step 2: FOUNDATION AGENT (runs after book research if applicable)
        console.log(`📚 Agent ${context.bookTitle ? '2/14' : '1/14'}: Foundational Materials & Reference Specialist`);
        const foundationContent = await callAgent(
            AGENTS.foundation,
            context,
            bookResearchContent // Pass book research if available
        );
        results.foundation = await generatePDF(
            foundationContent,
            'Foundational Framework',
            `foundation_${timestamp}.pdf`,
            context
        );
        console.log('✅ Foundation complete\n');

        // Add foundation to context for all subsequent agents
        context.foundationDocument = foundationContent;

        // Steps 3-14: Run all remaining agents in PARALLEL for speed
        const agentCount = context.bookTitle ? '12' : '12';
        console.log(`🚀 Running ${agentCount} agents in parallel...\n`);

        const parallelAgents = [
            {
                agent: AGENTS.bibleVersion,
                key: 'bibleVersion',
                title: 'Bible Translation Recommendation',
                filename: `bible_version_${timestamp}.pdf`,
                icon: '📖',
                name: 'Bible Translation'
            },
            {
                agent: AGENTS.theology,
                key: 'theology',
                title: 'Denominational Theological Framework',
                filename: `theology_${timestamp}.pdf`,
                icon: '✝️',
                name: 'Denominational Theology'
            },
            {
                agent: AGENTS.context,
                key: 'biblicalContext',
                title: 'Biblical Context Document',
                filename: `context_${timestamp}.pdf`,
                icon: '🏛️',
                name: 'Biblical Context'
            },
            {
                agent: AGENTS.hermeneutics,
                key: 'hermeneutics',
                title: 'Hermeneutical Guide',
                filename: `hermeneutics_${timestamp}.pdf`,
                icon: '🔍',
                name: 'Hermeneutics'
            },
            {
                agent: AGENTS.languages,
                key: 'originalLanguages',
                title: 'Original Languages Guide',
                filename: `languages_${timestamp}.pdf`,
                icon: '🔤',
                name: 'Original Languages'
            },
            {
                agent: AGENTS.crossReference,
                key: 'crossReference',
                title: 'Cross-Reference & Theology Guide',
                filename: `cross_reference_${timestamp}.pdf`,
                icon: '🔗',
                name: 'Cross-Reference'
            },
            {
                agent: AGENTS.application,
                key: 'application',
                title: 'Application & Discipleship Guide',
                filename: `application_${timestamp}.pdf`,
                icon: '🎯',
                name: 'Application'
            },
            {
                agent: AGENTS.discussion,
                key: 'smallGroup',
                title: 'Small Group Discussion Guide',
                filename: `discussion_${timestamp}.pdf`,
                icon: '💬',
                name: 'Small Group Discussion'
            },
            {
                agent: AGENTS.devotional,
                key: 'prayer',
                title: 'Prayer & Devotional Guide',
                filename: `devotional_${timestamp}.pdf`,
                icon: '🙏',
                name: 'Prayer & Devotional'
            },
            {
                agent: AGENTS.teaching,
                key: 'teachingMethods',
                title: 'Teaching Methods Guide',
                filename: `teaching_${timestamp}.pdf`,
                icon: '👨‍🏫',
                name: 'Teaching Methods'
            },
            {
                agent: AGENTS.studentStudyGuide,
                key: 'studentGuide',
                title: 'Student Study Guide',
                filename: `student_guide_${timestamp}.pdf`,
                icon: '📝',
                name: 'Student Study Guide'
            },
            {
                agent: AGENTS.leaderGuide,
                key: 'leaderGuide',
                title: "Leader's Guide",
                filename: `leader_guide_${timestamp}.pdf`,
                icon: '👥',
                name: "Leader's Guide"
            }
        ];

        // Execute all agents in parallel
        const parallelResults = await Promise.all(
            parallelAgents.map(async (agentConfig) => {
                console.log(`${agentConfig.icon} Starting: ${agentConfig.name}...`);
                const content = await callAgent(
                    agentConfig.agent,
                    context,
                    foundationContent
                );
                const pdf = await generatePDF(
                    content,
                    agentConfig.title,
                    agentConfig.filename,
                    context
                );
                console.log(`✅ Completed: ${agentConfig.name}`);
                return { key: agentConfig.key, pdf };
            })
        );

        // Add results to main results object
        parallelResults.forEach(({ key, pdf }) => {
            results[key] = pdf;
        });

        const totalAgents = context.bookTitle ? 14 : 13;
        console.log(`🎉 ALL ${totalAgents} AGENTS COMPLETED SUCCESSFULLY!\n`);
        return results;

    } catch (error) {
        console.error('❌ Error in Bible study generation:', error);
        throw error;
    }
}

/**
 * Build context object from form data
 */
function buildContext(formData) {
    const context = {
        // Study focus
        studyType: formData.studyFocus || 'passage', // 'passage', 'book', 'chapter', 'theme', 'book-study'
        passage: formData.passage || formData.theme || null,
        theme: formData.theme,

        // Book information (if book-based study)
        bookTitle: formData.bookTitle || null,
        bookAuthor: formData.bookAuthor || null,
        bookISBN: formData.bookISBN || null,
        bookISBN13: formData.bookISBN13 || null,

        // User specifications
        email: formData.email,
        denomination: formData.denomination,
        bibleVersion: formData.bibleVersion,
        ageGroup: formData.ageGroup,
        audience: formData.ageGroup,

        // Study details
        duration: formData.duration || '8 weeks',
        objectives: formData.objectives || formData.userThoughts || 'Deep understanding and practical application of Scripture',

        // Additional context
        userThoughts: formData.userThoughts || '',
        additionalContext: formData.userThoughts || '',

        // Group context (optional)
        groupSize: formData.groupSize || 'Small group (8-12 people)',
        teachingContext: formData.teachingContext || 'Small group Bible study',

        // Will be populated after agents run
        foundationDocument: null,
        bookResearchDocument: null
    };

    // Determine testament based on passage (simple heuristic)
    if (context.passage) {
        const passage = context.passage.toLowerCase();
        if (passage.includes('matthew') || passage.includes('mark') || passage.includes('luke') ||
            passage.includes('john') || passage.includes('acts') || passage.includes('romans') ||
            passage.includes('corinthians') || passage.includes('galatians') || passage.includes('ephesians') ||
            passage.includes('philippians') || passage.includes('colossians') || passage.includes('thessalonians') ||
            passage.includes('timothy') || passage.includes('titus') || passage.includes('philemon') ||
            passage.includes('hebrews') || passage.includes('james') || passage.includes('peter') ||
            passage.includes('jude') || passage.includes('revelation')) {
            context.testament = 'New Testament';
        } else {
            context.testament = 'Old Testament';
        }
    }

    return context;
}

/**
 * Call an AI agent with the given context
 */
async function callAgent(agent, context, previousDocument) {
    try {
        const systemPrompt = agent.systemPrompt;
        let userPrompt = agent.generatePrompt(context);

        // Build context from previous agents
        let contextPrefix = '';

        // Include book research if available and not the book research agent
        if (context.bookResearchDocument && agent.name !== 'Book Research & Analysis Specialist') {
            contextPrefix += `BOOK RESEARCH & ANALYSIS (created by Book Research Agent):
${context.bookResearchDocument}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
        }

        // Include foundation if available and not the foundation agent
        if (context.foundationDocument && agent.name !== 'Foundational Materials & Reference Specialist') {
            contextPrefix += `FOUNDATIONAL FRAMEWORK (created by Foundation Agent):
${context.foundationDocument}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
        }

        // If we have context to include
        if (contextPrefix) {
            userPrompt = `${contextPrefix}${userPrompt}

IMPORTANT: Ensure your output embodies the principles established in the documents above${context.bookTitle ? ', integrating the book analysis with Scripture' : ''}.`;
        }

        const response = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4000,
            messages: [{
                role: 'user',
                content: userPrompt
            }],
            system: systemPrompt
        });

        return response.content[0].text;

    } catch (error) {
        console.error(`Error calling ${agent.name}:`, error);
        throw error;
    }
}

module.exports = {
    generateBibleStudy
};
