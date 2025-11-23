/**
 * BibleOps Premium - Dashboard JavaScript
 */

// Require authentication
BibleOpsApp.requireAuth();

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    await loadUsageStats();
    await loadGenerationHistory();
    setupEventListeners();
});

// Load user information
async function loadUserInfo() {
    const user = BibleOpsApp.getCurrentUser();
    if (user) {
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('accountEmail').textContent = user.email;
    }
}

// Load usage statistics
async function loadUsageStats() {
    try {
        const response = await BibleOpsApp.apiRequest('/api/premium/usage');
        const data = await response.json();

        if (response.ok) {
            // Update usage count
            document.getElementById('usageCount').textContent = `${data.usageThisMonth || 0}`;

            // Update days remaining
            const daysRemaining = calculateDaysRemaining(data.periodEnd);
            document.getElementById('daysRemaining').textContent = daysRemaining;

            // Update overage count
            document.getElementById('overageCount').textContent = data.overageCount || 0;

            // Update subscription status
            const statusElement = document.getElementById('subscriptionStatus');
            statusElement.textContent = data.subscriptionStatus || 'Active';

            // Show overage warning if at limit
            if (data.usageThisMonth >= 4) {
                document.getElementById('overageNote').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Failed to load usage stats:', error);
    }
}

// Calculate days remaining in billing period
function calculateDaysRemaining(periodEnd) {
    if (!periodEnd) return '-';

    const end = new Date(periodEnd);
    const now = new Date();
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 0;
}

// Load generation history
async function loadGenerationHistory() {
    try {
        const response = await BibleOpsApp.apiRequest('/api/premium/history');
        const data = await response.json();

        const historyList = document.getElementById('historyList');

        if (!response.ok || !data.history || data.history.length === 0) {
            historyList.innerHTML = '<p class="loading">No curricula generated yet.</p>';
            return;
        }

        // Build history HTML
        historyList.innerHTML = data.history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <h3>${item.title || 'Curriculum'}</h3>
                    <p>Generated ${BibleOpsApp.formatDate(item.createdAt)}</p>
                    ${item.isOverage ? '<span style="color: var(--premium-gold);">• Overage ($4.99)</span>' : ''}
                </div>
                <div class="history-actions">
                    <a href="${item.downloadUrl}" class="btn-secondary" target="_blank">Download</a>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load history:', error);
        document.getElementById('historyList').innerHTML = '<p class="loading">Failed to load history.</p>';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            BibleOpsApp.logout();
        }
    });

    // Study focus change
    document.getElementById('studyFocus').addEventListener('change', (e) => {
        const focus = e.target.value;

        // Show/hide relevant fields
        document.getElementById('passageGroup').style.display = focus === 'passage' ? 'block' : 'none';
        document.getElementById('themeGroup').style.display = focus === 'theme' ? 'block' : 'none';
        document.getElementById('bookGroup').style.display = focus === 'book' ? 'block' : 'none';

        // Clear hidden fields
        if (focus !== 'passage') document.getElementById('passage').value = '';
        if (focus !== 'theme') document.getElementById('theme').value = '';
        if (focus !== 'book') {
            document.getElementById('bookTitle').value = '';
            document.getElementById('bookAuthor').value = '';
        }
    });

    // Generate form submission
    document.getElementById('generateForm').addEventListener('submit', handleGenerate);

    // Subscription management
    document.getElementById('manageSubscriptionBtn').addEventListener('click', async () => {
        try {
            // Create Stripe customer portal session
            const response = await BibleOpsApp.apiRequest('/api/premium/create-portal-session', {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok && data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to open subscription management. Please try again.');
            }
        } catch (error) {
            console.error('Portal session error:', error);
            alert('Failed to open subscription management. Please try again.');
        }
    });

    // Change email (placeholder)
    document.getElementById('changeEmailBtn').addEventListener('click', () => {
        alert('Change email functionality coming soon!');
    });

    // Change password (placeholder)
    document.getElementById('changePasswordBtn').addEventListener('click', () => {
        alert('Change password functionality coming soon!');
    });
}

// Handle curriculum generation
async function handleGenerate(e) {
    e.preventDefault();

    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = document.getElementById('generateBtn');

    // Hide messages
    formError.style.display = 'none';
    formSuccess.style.display = 'none';

    // Get form data
    const formData = {
        studyFocus: document.getElementById('studyFocus').value,
        passage: document.getElementById('passage').value,
        theme: document.getElementById('theme').value,
        bookTitle: document.getElementById('bookTitle').value,
        bookAuthor: document.getElementById('bookAuthor').value,
        denomination: document.getElementById('denomination').value,
        bibleVersion: document.getElementById('bibleVersion').value,
        ageGroup: document.getElementById('ageGroup').value
    };

    // Validate based on study focus
    if (formData.studyFocus === 'passage' && !formData.passage) {
        formError.textContent = 'Please enter a Bible passage';
        formError.style.display = 'block';
        return;
    }

    if (formData.studyFocus === 'theme' && !formData.theme) {
        formError.textContent = 'Please enter a theme';
        formError.style.display = 'block';
        return;
    }

    if (formData.studyFocus === 'book' && (!formData.bookTitle || !formData.bookAuthor)) {
        formError.textContent = 'Please enter book title and author';
        formError.style.display = 'block';
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';

    try {
        const response = await BibleOpsApp.apiRequest('/api/premium/generate', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Generation failed');
        }

        // Success
        formSuccess.innerHTML = `
            ✅ Curriculum generation started!<br>
            You'll receive an email with download links in 6-12 minutes.<br>
            ${data.isOverage ? `<strong>Charged $4.99 for overage generation.</strong>` : ''}
        `;
        formSuccess.style.display = 'block';

        // Reset form
        document.getElementById('generateForm').reset();

        // Reload stats after delay
        setTimeout(() => {
            loadUsageStats();
            loadGenerationHistory();
        }, 2000);

    } catch (error) {
        console.error('Generation error:', error);
        formError.textContent = error.message || 'Failed to generate curriculum. Please try again.';
        formError.style.display = 'block';
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Curriculum';
    }
}
