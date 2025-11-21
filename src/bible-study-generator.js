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

        // Step 1: FOUNDATION AGENT (runs first!)
        console.log('📚 Agent 1/11: Foundational Materials & Reference Specialist');
        const foundationContent = await callAgent(
            AGENTS.foundation,
            context,
            null // No previous foundation yet
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

        // Step 2: BIBLE VERSION AGENT
        console.log('📖 Agent 2/11: Bible Translation Specialist');
        const versionContent = await callAgent(
            AGENTS.bibleVersion,
            context,
            foundationContent
        );
        results.bibleVersion = await generatePDF(
            versionContent,
            'Bible Translation Recommendation',
            `bible_version_${timestamp}.pdf`,
            context
        );
        console.log('✅ Bible version complete\n');

        // Step 3: DENOMINATIONAL THEOLOGY AGENT
        console.log('✝️ Agent 3/11: Denominational Theology Specialist');
        const theologyContent = await callAgent(
            AGENTS.theology,
            context,
            foundationContent
        );
        results.theology = await generatePDF(
            theologyContent,
            'Denominational Theological Framework',
            `theology_${timestamp}.pdf`,
            context
        );
        console.log('✅ Theology complete\n');

        // Step 4: BIBLICAL CONTEXT AGENT
        console.log('🏛️ Agent 4/11: Biblical Context Specialist');
        const contextContent = await callAgent(
            AGENTS.context,
            context,
            foundationContent
        );
        results.biblicalContext = await generatePDF(
            contextContent,
            'Biblical Context Document',
            `context_${timestamp}.pdf`,
            context
        );
        console.log('✅ Biblical context complete\n');

        // Step 5: HERMENEUTICS AGENT
        console.log('🔍 Agent 5/11: Hermeneutics & Interpretation Specialist');
        const hermeneuticsContent = await callAgent(
            AGENTS.hermeneutics,
            context,
            foundationContent
        );
        results.hermeneutics = await generatePDF(
            hermeneuticsContent,
            'Hermeneutical Guide',
            `hermeneutics_${timestamp}.pdf`,
            context
        );
        console.log('✅ Hermeneutics complete\n');

        // Step 6: ORIGINAL LANGUAGES AGENT
        console.log('🔤 Agent 6/11: Original Languages Specialist');
        const languagesContent = await callAgent(
            AGENTS.languages,
            context,
            foundationContent
        );
        results.languages = await generatePDF(
            languagesContent,
            'Original Languages Guide',
            `languages_${timestamp}.pdf`,
            context
        );
        console.log('✅ Original languages complete\n');

        // Step 7: CROSS-REFERENCE & THEOLOGY AGENT
        console.log('🔗 Agent 7/11: Cross-Reference & Theology Specialist');
        const crossRefContent = await callAgent(
            AGENTS.crossReference,
            context,
            foundationContent
        );
        results.crossReference = await generatePDF(
            crossRefContent,
            'Cross-Reference & Theology Guide',
            `cross_reference_${timestamp}.pdf`,
            context
        );
        console.log('✅ Cross-references complete\n');

        // Step 8: APPLICATION & DISCIPLESHIP AGENT
        console.log('🎯 Agent 8/11: Application & Discipleship Specialist');
        const applicationContent = await callAgent(
            AGENTS.application,
            context,
            foundationContent
        );
        results.application = await generatePDF(
            applicationContent,
            'Application & Discipleship Guide',
            `application_${timestamp}.pdf`,
            context
        );
        console.log('✅ Application complete\n');

        // Step 9: SMALL GROUP DISCUSSION AGENT
        console.log('💬 Agent 9/11: Small Group Discussion Specialist');
        const discussionContent = await callAgent(
            AGENTS.discussion,
            context,
            foundationContent
        );
        results.discussion = await generatePDF(
            discussionContent,
            'Small Group Discussion Guide',
            `discussion_${timestamp}.pdf`,
            context
        );
        console.log('✅ Discussion complete\n');

        // Step 10: PRAYER & DEVOTIONAL AGENT
        console.log('🙏 Agent 10/11: Prayer & Devotional Specialist');
        const devotionalContent = await callAgent(
            AGENTS.devotional,
            context,
            foundationContent
        );
        results.devotional = await generatePDF(
            devotionalContent,
            'Prayer & Devotional Guide',
            `devotional_${timestamp}.pdf`,
            context
        );
        console.log('✅ Devotional complete\n');

        // Step 11: TEACHING METHODS AGENT
        console.log('👨‍🏫 Agent 11/11: Teaching Methods Specialist');
        const teachingContent = await callAgent(
            AGENTS.teaching,
            context,
            foundationContent
        );
        results.teaching = await generatePDF(
            teachingContent,
            'Teaching Methods Guide',
            `teaching_${timestamp}.pdf`,
            context
        );
        console.log('✅ Teaching methods complete\n');

        console.log('🎉 ALL 11 AGENTS COMPLETED SUCCESSFULLY!\n');
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
        studyType: formData.studyFocus || 'passage', // 'passage', 'book', 'chapter', 'theme'
        passage: formData.passage || formData.theme,
        theme: formData.theme,

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

        // Will be populated after foundation agent runs
        foundationDocument: null
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
async function callAgent(agent, context, foundationDocument) {
    try {
        const systemPrompt = agent.systemPrompt;
        let userPrompt = agent.generatePrompt(context);

        // If foundation document exists and this isn't the foundation agent, include it
        if (foundationDocument && agent.name !== 'Foundational Materials & Reference Specialist') {
            userPrompt = `FOUNDATIONAL FRAMEWORK (created by Foundation Agent):
${foundationDocument}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${userPrompt}

IMPORTANT: Ensure your output embodies the principles established in the Foundational Framework above.`;
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
