/**
 * Bible Study Curriculum Generator
 * Frontend Application Logic
 */

// API Configuration
// Auto-detect environment: localhost vs production
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://bibleops.onrender.com/api';

// Component names for progress tracking
const COMPONENTS = [
    { name: 'Book Research & Analysis', icon: '📖', bookOnly: true },
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
    { name: 'Teaching Methods', icon: '👨‍🏫' },
    { name: 'Student Study Guide', icon: '📝' },
    { name: "Leader's Guide", icon: '👥' }
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

            if (e.target.value === 'passage') {
                passageInput.style.display = 'block';
                themeInput.style.display = 'none';
                bookInput.style.display = 'none';
                passageField.required = true;
                themeField.required = false;
                bookTitleField.required = false;
                bookAuthorField.required = false;
            } else if (e.target.value === 'theme') {
                passageInput.style.display = 'none';
                themeInput.style.display = 'block';
                bookInput.style.display = 'none';
                passageField.required = false;
                themeField.required = true;
                bookTitleField.required = false;
                bookAuthorField.required = false;
            } else if (e.target.value === 'book') {
                passageInput.style.display = 'none';
                themeInput.style.display = 'none';
                bookInput.style.display = 'block';
                passageField.required = false;
                themeField.required = false;
                bookTitleField.required = true;
                bookAuthorField.required = true;
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
