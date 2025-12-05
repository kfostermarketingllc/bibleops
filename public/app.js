/**
 * Bible Study Curriculum Generator
 * Frontend Application Logic
 */

// API Configuration
// Auto-detect environment: localhost vs production
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://bibleops.onrender.com/api';

// Optional component definitions (for checkbox selection)
const OPTIONAL_COMPONENTS = {
    bookResearch: { name: 'Book Research & Analysis', icon: '📖', bookOnly: true },
    foundation: { name: 'Foundational Framework', icon: '📚' },
    theology: { name: 'Denominational Theology', icon: '✝️' },
    biblicalContext: { name: 'Biblical Context', icon: '🏛️' },
    hermeneutics: { name: 'Hermeneutics & Interpretation', icon: '🔍' },
    originalLanguages: { name: 'Original Languages', icon: '🔤' },
    crossReference: { name: 'Cross-Reference & Theology', icon: '🔗' },
    application: { name: 'Application & Discipleship', icon: '🎯' },
    prayer: { name: 'Prayer & Devotional', icon: '🙏' }
};

// Always-included components (based on group size)
const GROUP_STUDY_COMPONENTS = [
    { name: 'Small Group Discussion', icon: '💬' },
    { name: 'Teaching Methods', icon: '👨‍🏫' },
    { name: 'Student Study Guide', icon: '📝' },
    { name: "Leader's Guide", icon: '👥' }
];

const INDIVIDUAL_STUDY_COMPONENTS = [
    { name: 'Individual Study Guide', icon: '📖' }
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

    // Toggle between passage, theme, and book inputs
    studyFocusRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const passageInput = document.getElementById('passageInput');
            const themeInput = document.getElementById('themeInput');
            const bookInput = document.getElementById('bookInput');
            const passageField = document.getElementById('passage');
            const themeField = document.getElementById('theme');
            const bookTitleField = document.getElementById('bookTitle');
            const bookAuthorField = document.getElementById('bookAuthor');
            const bookResearchCheckbox = document.getElementById('bookResearchCheckboxLabel');

            if (e.target.value === 'passage') {
                passageInput.style.display = 'block';
                themeInput.style.display = 'none';
                bookInput.style.display = 'none';
                passageField.required = true;
                themeField.required = false;
                bookTitleField.required = false;
                bookAuthorField.required = false;
                // Hide book research checkbox
                bookResearchCheckbox.style.display = 'none';
                bookResearchCheckbox.querySelector('input').checked = false;
            } else if (e.target.value === 'theme') {
                passageInput.style.display = 'none';
                themeInput.style.display = 'block';
                bookInput.style.display = 'none';
                passageField.required = false;
                themeField.required = true;
                bookTitleField.required = false;
                bookAuthorField.required = false;
                // Hide book research checkbox
                bookResearchCheckbox.style.display = 'none';
                bookResearchCheckbox.querySelector('input').checked = false;
            } else if (e.target.value === 'book') {
                passageInput.style.display = 'none';
                themeInput.style.display = 'none';
                bookInput.style.display = 'block';
                passageField.required = false;
                themeField.required = false;
                bookTitleField.required = true;
                bookAuthorField.required = true;
                // Show book research checkbox for book studies
                bookResearchCheckbox.style.display = 'flex';
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

    // Disable submit button
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('generateBtn').textContent = 'Submitting...';

    try {
        // Call API to generate curriculum (returns immediately)
        const result = await generateCurriculum(formData);

        // Show success message
        displayAsyncSuccess(result);

    } catch (error) {
        console.error('Error submitting request:', error);
        alert('Error submitting request: ' + error.message);

        // Reset button
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('generateBtn').textContent = 'Generate My Bible Study';
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

    // Add passage, theme, or book based on selection
    if (formData.studyFocus === 'passage') {
        formData.passage = document.getElementById('passage').value;
    } else if (formData.studyFocus === 'theme') {
        formData.theme = document.getElementById('theme').value;
    } else if (formData.studyFocus === 'book') {
        formData.bookTitle = document.getElementById('bookTitle').value;
        formData.bookAuthor = document.getElementById('bookAuthor').value;
        formData.bookISBN = document.getElementById('bookISBN').value || '';
        formData.bookISBN13 = document.getElementById('bookISBN13').value || '';
        formData.passage = document.getElementById('bookPassage').value || '';
    }

    // Collect selected optional outputs
    const selectedOutputs = [];
    document.querySelectorAll('input[name="selectedOutputs"]:checked').forEach(checkbox => {
        selectedOutputs.push(checkbox.value);
    });
    formData.selectedOutputs = selectedOutputs;

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

    if (formData.studyFocus === 'book') {
        if (!formData.bookTitle) {
            alert('Please enter the book title');
            return false;
        }
        if (!formData.bookAuthor) {
            alert('Please enter the book author');
            return false;
        }
        // Related Scripture passage is optional for book studies
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
        let errorMessage = 'Failed to generate curriculum';
        try {
            const error = await response.json();
            errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

/**
 * Simulate progress for visual feedback
 */
function simulateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const componentStatus = document.getElementById('componentStatus');

    // Create component status items
    componentStatus.innerHTML = COMPONENTS.map((component, index) => `
        <div class="component-item pending" id="component-${index}">
            <span>${component.icon}</span>
            <span>${component.name}</span>
        </div>
    `).join('');

    let currentComponent = 0;
    const totalComponents = COMPONENTS.length;
    const estimatedTimePerComponent = 10; // seconds (faster with parallel execution)

    const interval = setInterval(() => {
        if (currentComponent < totalComponents) {
            // Update progress bar
            const progress = ((currentComponent + 1) / totalComponents) * 100;
            progressBar.style.width = `${progress}%`;

            // Update progress text
            progressText.textContent = `Processing ${currentComponent + 1} of ${totalComponents}: ${COMPONENTS[currentComponent].name}...`;

            // Update component status
            if (currentComponent > 0) {
                const prevComponent = document.getElementById(`component-${currentComponent - 1}`);
                prevComponent.classList.remove('in-progress');
                prevComponent.classList.add('completed');
            }

            const currentComponentEl = document.getElementById(`component-${currentComponent}`);
            currentComponentEl.classList.remove('pending');
            currentComponentEl.classList.add('in-progress');

            currentComponent++;

            // If last component, mark as completed
            if (currentComponent === totalComponents) {
                setTimeout(() => {
                    const lastComponent = document.getElementById(`component-${currentComponent - 1}`);
                    lastComponent.classList.remove('in-progress');
                    lastComponent.classList.add('completed');
                    progressText.textContent = 'Finalizing curriculum...';
                }, estimatedTimePerComponent * 500);
            }
        }
    }, estimatedTimePerComponent * 1000);

    // Store interval ID for potential cleanup
    window.progressInterval = interval;
}

/**
 * Display async success message
 */
function displayAsyncSuccess(result) {
    // Hide form
    document.querySelector('.form-container').style.display = 'none';

    // Show success message
    const successSection = document.getElementById('successSection') || createSuccessSection();
    successSection.style.display = 'block';

    // Update message
    document.getElementById('successEmail').textContent = result.email;
    document.getElementById('estimatedTime').textContent = result.estimatedTime || '6-10 minutes';
    document.getElementById('jobId').textContent = result.jobId;
}

/**
 * Create success section if it doesn't exist
 */
function createSuccessSection() {
    const section = document.createElement('div');
    section.id = 'successSection';
    section.className = 'success-section';
    section.style.display = 'none';
    section.innerHTML = `
        <div class="success-container">
            <div class="success-icon">✅</div>
            <h2>Your Bible Study is Being Generated!</h2>
            <div class="success-message">
                <p class="main-message">
                    Your curriculum is being created by our 14 specialized AI agents.
                </p>
                <div class="info-box">
                    <p><strong>📧 Email:</strong> <span id="successEmail"></span></p>
                    <p><strong>⏱️ Estimated Time:</strong> <span id="estimatedTime"></span></p>
                    <p><strong>🆔 Job ID:</strong> <code id="jobId"></code></p>
                </div>
                <p class="secondary-message">
                    You'll receive an email with all PDFs when complete. Feel free to close this page!
                </p>
            </div>
            <div class="success-actions">
                <button onclick="location.reload()" class="btn btn-secondary">Generate Another Study</button>
            </div>
        </div>
    `;

    // Insert BEFORE the footer instead of appending to end
    const footer = document.querySelector('.footer');
    const container = document.querySelector('.container');
    container.insertBefore(section, footer);

    return section;
}

/**
 * Display results (DEPRECATED - kept for backwards compatibility)
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

    // Create download links - all optional outputs plus study guides
    const downloadLinks = document.getElementById('downloadLinks');
    const downloads = [
        { key: 'bookResearch', title: 'Book Research & Analysis', icon: '📖' },
        { key: 'foundation', title: 'Foundational Framework', icon: '📚' },
        { key: 'theology', title: 'Denominational Theological Framework', icon: '✝️' },
        { key: 'biblicalContext', title: 'Biblical Context Document', icon: '🏛️' },
        { key: 'hermeneutics', title: 'Hermeneutical Guide', icon: '🔍' },
        { key: 'originalLanguages', title: 'Original Languages Guide', icon: '🔤' },
        { key: 'crossReference', title: 'Cross-Reference & Theology Guide', icon: '🔗' },
        { key: 'application', title: 'Application & Discipleship Guide', icon: '🎯' },
        { key: 'prayer', title: 'Prayer & Devotional Guide', icon: '🙏' },
        { key: 'smallGroup', title: 'Small Group Discussion Guide', icon: '💬' },
        { key: 'teachingMethods', title: 'Teaching Methods Guide', icon: '👨‍🏫' },
        { key: 'studentGuide', title: 'Student Study Guide', icon: '📝' },
        { key: 'leaderGuide', title: "Leader's Guide", icon: '👥' },
        { key: 'individualGuide', title: 'Individual Study Guide', icon: '📖' }
    ];

    downloadLinks.innerHTML = downloads.map(download => {
        const item = result[download.key];
        if (!item) return '';

        return `
            <a href="${item.path}" class="download-card" download>
                <div class="download-icon">${download.icon}</div>
                <h3>${item.title}</h3>
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
