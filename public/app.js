/**
 * Bible Study Curriculum Generator
 * Frontend Application Logic
 */

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Agent names for progress tracking
const AGENTS = [
    { name: 'Foundational Materials & Reference', icon: '📚' },
    { name: 'Bible Translation', icon: '📖' },
    { name: 'Denominational Theology', icon: '✝️' },
    { name: 'Biblical Context', icon: '🏛️' },
    { name: 'Hermeneutics & Interpretation', icon: '🔍' },
    { name: 'Original Languages', icon: '🔤' },
    { name: 'Cross-Reference & Theology', icon: '🔗' },
    { name: 'Application & Discipleship', icon: '🎯' },
    { name: 'Small Group Discussion', icon: '💬' },
    { name: 'Prayer & Devotional', icon: '🙏' },
    { name: 'Teaching Methods', icon: '👨‍🏫' }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupFormHandlers();
    checkApiHealth();
});

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
    const form = document.getElementById('bibleStudyForm');
    const studyFocusRadios = document.querySelectorAll('input[name="studyFocus"]');

    // Toggle between passage and theme inputs
    studyFocusRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const passageInput = document.getElementById('passageInput');
            const themeInput = document.getElementById('themeInput');
            const passageField = document.getElementById('passage');
            const themeField = document.getElementById('theme');

            if (e.target.value === 'passage') {
                passageInput.style.display = 'block';
                themeInput.style.display = 'none';
                passageField.required = true;
                themeField.required = false;
            } else {
                passageInput.style.display = 'none';
                themeInput.style.display = 'block';
                passageField.required = false;
                themeField.required = true;
            }
        });
    });

    // Form submission
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = collectFormData();

    // Validate form
    if (!validateForm(formData)) {
        return;
    }

    // Hide form and show progress
    document.querySelector('.form-container').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('generateBtn').disabled = true;

    // Start progress simulation
    simulateProgress();

    try {
        // Call API to generate curriculum
        const result = await generateCurriculum(formData);

        // Show results
        displayResults(result);

    } catch (error) {
        console.error('Error generating curriculum:', error);
        alert('Error generating curriculum. Please check the console and try again.');

        // Reset UI
        document.querySelector('.form-container').style.display = 'block';
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
    }
}

/**
 * Collect form data
 */
function collectFormData() {
    const formData = {
        studyFocus: document.querySelector('input[name="studyFocus"]:checked').value,
        email: document.getElementById('email').value,
        denomination: document.getElementById('denomination').value,
        bibleVersion: document.getElementById('bibleVersion').value,
        ageGroup: document.getElementById('ageGroup').value,
        duration: document.getElementById('duration').value,
        userThoughts: document.getElementById('userThoughts').value,
        groupSize: document.getElementById('groupSize').value,
        teachingContext: document.getElementById('teachingContext').value
    };

    // Add passage or theme based on selection
    if (formData.studyFocus === 'passage') {
        formData.passage = document.getElementById('passage').value;
    } else {
        formData.theme = document.getElementById('theme').value;
    }

    return formData;
}

/**
 * Validate form data
 */
function validateForm(formData) {
    if (!formData.email) {
        alert('Please enter your email address');
        return false;
    }

    if (formData.studyFocus === 'passage' && !formData.passage) {
        alert('Please enter a Bible passage');
        return false;
    }

    if (formData.studyFocus === 'theme' && !formData.theme) {
        alert('Please enter a study theme');
        return false;
    }

    if (!formData.denomination) {
        alert('Please select your denomination');
        return false;
    }

    if (!formData.bibleVersion) {
        alert('Please select a Bible version');
        return false;
    }

    if (!formData.ageGroup) {
        alert('Please select an age group');
        return false;
    }

    return true;
}

/**
 * Call API to generate curriculum
 */
async function generateCurriculum(formData) {
    const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate curriculum');
    }

    return await response.json();
}

/**
 * Simulate progress for visual feedback
 */
function simulateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const agentStatus = document.getElementById('agentStatus');

    // Create agent status items
    agentStatus.innerHTML = AGENTS.map((agent, index) => `
        <div class="agent-item pending" id="agent-${index}">
            <span>${agent.icon}</span>
            <span>${agent.name}</span>
        </div>
    `).join('');

    let currentAgent = 0;
    const totalAgents = AGENTS.length;
    const estimatedTimePerAgent = 30; // seconds

    const interval = setInterval(() => {
        if (currentAgent < totalAgents) {
            // Update progress bar
            const progress = ((currentAgent + 1) / totalAgents) * 100;
            progressBar.style.width = `${progress}%`;

            // Update progress text
            progressText.textContent = `Processing Agent ${currentAgent + 1} of ${totalAgents}: ${AGENTS[currentAgent].name}...`;

            // Update agent status
            if (currentAgent > 0) {
                const prevAgent = document.getElementById(`agent-${currentAgent - 1}`);
                prevAgent.classList.remove('in-progress');
                prevAgent.classList.add('completed');
            }

            const currentAgentEl = document.getElementById(`agent-${currentAgent}`);
            currentAgentEl.classList.remove('pending');
            currentAgentEl.classList.add('in-progress');

            currentAgent++;

            // If last agent, mark as completed
            if (currentAgent === totalAgents) {
                setTimeout(() => {
                    const lastAgent = document.getElementById(`agent-${currentAgent - 1}`);
                    lastAgent.classList.remove('in-progress');
                    lastAgent.classList.add('completed');
                    progressText.textContent = 'Finalizing curriculum...';
                }, estimatedTimePerAgent * 500);
            }
        }
    }, estimatedTimePerAgent * 1000);

    // Store interval ID for potential cleanup
    window.progressInterval = interval;
}

/**
 * Display results
 */
function displayResults(result) {
    // Clear progress interval
    if (window.progressInterval) {
        clearInterval(window.progressInterval);
    }

    // Hide progress section
    document.getElementById('progressSection').style.display = 'none';

    // Show results section
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';

    // Create download links
    const downloadLinks = document.getElementById('downloadLinks');
    const downloads = [
        { key: 'foundation', title: 'Foundational Framework', icon: '📚' },
        { key: 'bibleVersion', title: 'Bible Translation Recommendation', icon: '📖' },
        { key: 'theology', title: 'Denominational Theological Framework', icon: '✝️' },
        { key: 'biblicalContext', title: 'Biblical Context Document', icon: '🏛️' },
        { key: 'hermeneutics', title: 'Hermeneutical Guide', icon: '🔍' },
        { key: 'languages', title: 'Original Languages Guide', icon: '🔤' },
        { key: 'crossReference', title: 'Cross-Reference & Theology Guide', icon: '🔗' },
        { key: 'application', title: 'Application & Discipleship Guide', icon: '🎯' },
        { key: 'discussion', title: 'Small Group Discussion Guide', icon: '💬' },
        { key: 'devotional', title: 'Prayer & Devotional Guide', icon: '🙏' },
        { key: 'teaching', title: 'Teaching Methods Guide', icon: '👨‍🏫' }
    ];

    downloadLinks.innerHTML = downloads.map(download => {
        const item = result[download.key];
        if (!item) return '';

        return `
            <a href="${item.path}" class="download-card" download>
                <div class="download-icon">${download.icon}</div>
                <h3>${item.title}</h3>
                <p>${item.pages} pages | ${formatFileSize(item.size)}</p>
                <p>Click to download PDF</p>
            </a>
        `;
    }).join('');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Check API health
 */
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const health = await response.json();

        if (!health.anthropicConfigured) {
            console.warn('⚠️ Anthropic API key not configured');
        } else {
            console.log('✅ API is healthy and configured');
        }
    } catch (error) {
        console.error('❌ Could not connect to API:', error);
    }
}
