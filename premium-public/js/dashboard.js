/**
 * BibleOps Premium - Dashboard JavaScript
 */

// Require authentication
BibleOpsApp.requireAuth();

// Global state
let currentUsage = {
    usageThisMonth: 0,
    monthlyLimit: 4,
    tier: 'free',
    overageAllowed: false
};

let pendingFormData = null;

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if returning from checkout
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');

    if (checkoutStatus === 'success') {
        // Sync subscription status from Stripe (handles webhook race condition)
        await syncSubscriptionStatus();
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await loadUserInfo();
    await loadUsageStats();
    await loadGenerationHistory();
    setupEventListeners();
    setupModalHandlers();
});

// Sync subscription status after checkout
async function syncSubscriptionStatus() {
    try {
        console.log('🔄 Syncing subscription status...');
        const response = await BibleOpsApp.apiRequest('/api/premium/sync-subscription', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.synced) {
            console.log(`✅ Subscription synced: ${data.tier}`);
            // Update stored user info with new tier
            const storedUser = BibleOpsApp.getCurrentUser();
            if (storedUser) {
                storedUser.tier = data.tier;
                localStorage.setItem('bibleops_user', JSON.stringify(storedUser));
            }
        } else {
            console.log('ℹ️ Subscription not synced:', data.message);
        }

        return data;
    } catch (error) {
        console.error('Failed to sync subscription:', error);
        return null;
    }
}

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
            // Store in global state
            currentUsage = {
                usageThisMonth: data.usageThisMonth || 0,
                monthlyLimit: data.monthlyLimit || 4,
                tier: data.tier || 'free',
                overageAllowed: data.overageAllowed || false,
                overagePrice: data.overagePrice || 4.99
            };

            // Update usage count
            document.getElementById('usageCount').textContent = `${currentUsage.usageThisMonth}`;

            // Update days remaining
            const daysRemaining = calculateDaysRemaining(data.periodEnd);
            document.getElementById('daysRemaining').textContent = daysRemaining;

            // Update overage count
            document.getElementById('overageCount').textContent = data.overageCount || 0;

            // Update subscription status with proper tier name
            const statusElement = document.getElementById('subscriptionStatus');
            const statusCard = statusElement.closest('.stat-card');

            // Display appropriate subscription status based on tier
            let statusText = 'Free';
            switch (data.tier) {
                case 'premium':
                    statusText = 'Premium (Monthly)';
                    break;
                case 'annual':
                    statusText = 'Premium (Annual)';
                    break;
                case 'church':
                    statusText = 'Church/Ministry';
                    break;
                default:
                    statusText = 'Free';
            }
            statusElement.textContent = statusText;

            // Style status card based on tier
            statusCard.classList.remove('free', 'inactive');
            if (data.tier === 'free') {
                statusCard.classList.add('free');
            }

            // Show/hide upgrade banner and overage note
            updateUpgradeBanner(data);

            // Show overage warning if at limit
            if (currentUsage.usageThisMonth >= currentUsage.monthlyLimit && currentUsage.overageAllowed) {
                document.getElementById('overageNote').style.display = 'block';
            } else {
                document.getElementById('overageNote').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to load usage stats:', error);
    }
}

// Update upgrade banner based on user status
function updateUpgradeBanner(data) {
    const banner = document.getElementById('upgradeBanner');
    const title = document.getElementById('upgradeBannerTitle');
    const message = document.getElementById('upgradeBannerMessage');
    const btn = document.getElementById('upgradeBannerBtn');

    // Hide banner for all premium/subscribed users
    if (data.tier === 'premium' || data.tier === 'annual' || data.tier === 'church') {
        banner.style.display = 'none';
        return;
    }

    if (data.tier === 'free') {
        // Free user - show upgrade prompt
        banner.style.display = 'block';
        title.textContent = 'Upgrade to Premium';
        message.textContent = 'Get 4 curriculum generations per month, plus $4.99 for additional generations.';
        btn.textContent = 'Upgrade Now - $19.97/mo';
        btn.onclick = () => startCheckout('individual_monthly');
    } else if (data.usageThisMonth >= data.monthlyLimit && !data.overageAllowed) {
        // At limit and no overage allowed (shouldn't happen for premium)
        banner.style.display = 'block';
        title.textContent = 'Monthly Limit Reached';
        message.textContent = 'Upgrade to unlock more generations.';
        btn.textContent = 'View Plans';
        btn.onclick = () => window.location.href = '/premium/index.html#pricing';
    } else {
        // Hide for any other case
        banner.style.display = 'none';
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

        // Build history HTML with download buttons
        historyList.innerHTML = data.history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <h3>${item.title || 'Curriculum'}</h3>
                    <p>Generated ${BibleOpsApp.formatDate(item.createdAt)}</p>
                    ${item.isOverage ? '<span style="color: var(--premium-gold);">• Overage ($4.99)</span>' : ''}
                </div>
                <div class="history-actions">
                    <button class="btn-secondary" onclick="downloadCurriculum('${item.downloadUrl}', '${(item.title || 'Curriculum').replace(/'/g, "\\'")}')">
                        Download ZIP
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load history:', error);
        document.getElementById('historyList').innerHTML = '<p class="loading">Failed to load history.</p>';
    }
}

// Download curriculum as ZIP file
async function downloadCurriculum(downloadUrl, title) {
    try {
        // Show loading state
        event.target.disabled = true;
        event.target.textContent = 'Downloading...';

        // Make authenticated request to download endpoint
        const response = await BibleOpsApp.apiRequest(downloadUrl);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || 'Download failed');
        }

        // Get the blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        // Get filename from Content-Disposition header or generate one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `BibleOps_${title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')}.zip`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Reset button
        event.target.disabled = false;
        event.target.textContent = 'Download ZIP';

    } catch (error) {
        console.error('Download error:', error);
        alert(error.message || 'Failed to download curriculum. Please try again.');

        // Reset button
        event.target.disabled = false;
        event.target.textContent = 'Download ZIP';
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

    // Study focus change (radio buttons)
    const studyFocusRadios = document.querySelectorAll('input[name="studyFocus"]');
    studyFocusRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const focus = e.target.value;

            // Show/hide relevant fields (matching free version IDs)
            document.getElementById('passageInput').style.display = focus === 'passage' ? 'block' : 'none';
            document.getElementById('themeInput').style.display = focus === 'theme' ? 'block' : 'none';
            document.getElementById('bookInput').style.display = focus === 'book' ? 'block' : 'none';

            // Show/hide Book Research checkbox based on study type
            const bookResearchCheckbox = document.getElementById('bookResearchCheckboxLabel');
            if (bookResearchCheckbox) {
                bookResearchCheckbox.style.display = focus === 'book' ? 'flex' : 'none';
            }

            // Clear hidden fields
            if (focus !== 'passage') document.getElementById('passage').value = '';
            if (focus !== 'theme') document.getElementById('theme').value = '';
            if (focus !== 'book') {
                document.getElementById('bookTitle').value = '';
                document.getElementById('bookAuthor').value = '';
                document.getElementById('bookISBN').value = '';
                document.getElementById('bookISBN13').value = '';
                document.getElementById('bookPassage').value = '';
                // Uncheck book research if not a book study
                const bookResearchInput = document.querySelector('input[value="bookResearch"]');
                if (bookResearchInput) bookResearchInput.checked = false;
            }
        });
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

// Setup modal handlers for overage confirmation
function setupModalHandlers() {
    const modal = document.getElementById('overageModal');
    const closeBtn = document.getElementById('closeOverageModal');
    const cancelBtn = document.getElementById('cancelOverageBtn');
    const confirmBtn = document.getElementById('confirmOverageBtn');

    // Close modal handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            pendingFormData = null;
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            pendingFormData = null;
        });
    }

    // Click backdrop to close
    const backdrop = modal?.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            modal.style.display = 'none';
            pendingFormData = null;
        });
    }

    // Confirm overage and proceed with generation
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!pendingFormData) return;

            modal.style.display = 'none';

            // Add overage confirmation flag
            pendingFormData.confirmOverage = true;

            // Proceed with generation
            await executeGeneration(pendingFormData);
            pendingFormData = null;
        });
    }
}

// Start Stripe checkout for subscription upgrade
async function startCheckout(planType) {
    try {
        const response = await BibleOpsApp.apiRequest('/api/premium/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ planType })
        });

        const data = await response.json();

        if (response.ok && data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error || 'Failed to start checkout. Please try again.');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to start checkout. Please try again.');
    }
}

// Handle curriculum generation
async function handleGenerate(e) {
    e.preventDefault();

    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');

    // Hide messages
    formError.style.display = 'none';
    formSuccess.style.display = 'none';

    // Get study focus from radio buttons
    const studyFocusRadio = document.querySelector('input[name="studyFocus"]:checked');
    const studyFocus = studyFocusRadio ? studyFocusRadio.value : 'passage';

    // Collect selected optional outputs
    const selectedOutputs = [];
    document.querySelectorAll('input[name="selectedOutputs"]:checked').forEach(checkbox => {
        selectedOutputs.push(checkbox.value);
    });

    // Get form data - matching free tool exactly
    const formData = {
        studyFocus: studyFocus,
        passage: document.getElementById('passage').value,
        theme: document.getElementById('theme').value,
        bookTitle: document.getElementById('bookTitle').value,
        bookAuthor: document.getElementById('bookAuthor').value,
        bookISBN: document.getElementById('bookISBN').value,
        bookISBN13: document.getElementById('bookISBN13').value,
        bookPassage: document.getElementById('bookPassage').value,
        denomination: document.getElementById('denomination').value,
        bibleVersion: document.getElementById('bibleVersion').value,
        ageGroup: document.getElementById('ageGroup').value,
        duration: document.getElementById('duration').value,
        userThoughts: document.getElementById('userThoughts').value,
        groupSize: document.getElementById('groupSize').value,
        teachingContext: document.getElementById('teachingContext').value,
        selectedOutputs: selectedOutputs
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

    // Check if user is at their limit and needs overage confirmation
    if (currentUsage.usageThisMonth >= currentUsage.monthlyLimit) {
        if (currentUsage.tier === 'free') {
            // Free users can't generate more - show upgrade prompt
            formError.textContent = 'You have reached your free trial limit. Please upgrade to continue generating curricula.';
            formError.style.display = 'block';
            return;
        } else if (currentUsage.overageAllowed) {
            // Premium user at limit - show overage confirmation modal
            pendingFormData = formData;
            document.getElementById('overageModal').style.display = 'flex';
            return;
        }
    }

    // Proceed with generation
    await executeGeneration(formData);
}

// Execute the actual generation request
async function executeGeneration(formData) {
    const formError = document.getElementById('formError');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = document.getElementById('generateBtn');

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
            Curriculum generation started!<br>
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
