/**
 * BibleOps Premium - Stripe Integration
 * Payment processing and subscription management
 */

const Stripe = require('stripe');
const db = require('./database');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe Price IDs from environment
const PRICE_IDS = {
    individual_monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY,
    individual_annual: process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL,
    church_monthly: process.env.STRIPE_PRICE_CHURCH_MONTHLY
};

/**
 * Create Stripe Checkout Session for subscription
 * @param {string} email - User email
 * @param {string} priceId - Stripe price ID
 * @param {string} successUrl - URL to redirect on success
 * @param {string} cancelUrl - URL to redirect on cancel
 * @returns {Promise<Object>} Checkout session
 */
async function createCheckoutSession(email, priceId, successUrl, cancelUrl) {
    try {
        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: {
                email: email
            }
        });

        return session;
    } catch (error) {
        console.error('Stripe checkout session error:', error);
        throw error;
    }
}

/**
 * Create Stripe Customer Portal session
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - URL to redirect back to
 * @returns {Promise<Object>} Portal session
 */
async function createPortalSession(customerId, returnUrl) {
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl
        });

        return session;
    } catch (error) {
        console.error('Stripe portal session error:', error);
        throw error;
    }
}

/**
 * Charge for overage generation
 * @param {string} customerId - Stripe customer ID
 * @param {number} amount - Amount in cents (e.g., 499 for $4.99)
 * @param {string} description - Payment description
 * @returns {Promise<Object>} Payment intent
 */
async function chargeOverage(customerId, amount, description) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            customer: customerId,
            amount: amount,
            currency: 'usd',
            description: description,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            },
            off_session: true,
            confirm: true
        });

        return paymentIntent;
    } catch (error) {
        console.error('Stripe overage charge error:', error);
        throw error;
    }
}

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe webhook event
 */
async function handleWebhook(event) {
    console.log(`📨 Stripe webhook: ${event.type}`);

    // Log webhook event to database
    await db.logWebhookEvent(event.id, event.type, event.data);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }

        // Mark webhook as processed
        await db.markWebhookProcessed(event.id);

    } catch (error) {
        console.error(`❌ Error processing webhook ${event.type}:`, error);
        throw error;
    }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session) {
    const email = session.customer_email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    console.log(`✅ Checkout completed for ${email}, customer: ${customerId}`);

    // Get or create user
    let user = await db.getUserByEmail(email);

    if (user) {
        // Update existing user with Stripe customer ID
        console.log(`⬆️ Updating user ${email} with Stripe customer ID: ${customerId}`);
        await db.updateUserStripeCustomerId(user.id, customerId);

        // Also update tier to premium immediately (subscription.created will refine this)
        await db.query(
            'UPDATE users SET tier = $1 WHERE id = $2',
            ['premium', user.id]
        );
        console.log(`✅ User ${email} tier updated to premium`);
    } else {
        // Create new premium user (shouldn't happen, but handle it)
        console.log(`🆕 Creating new premium user: ${email}`);
        user = await db.createUser(email, null); // No password yet
        await db.updateUserStripeCustomerId(user.id, customerId);
        await db.query(
            'UPDATE users SET tier = $1 WHERE id = $2',
            ['premium', user.id]
        );
    }

    // Subscription details will be refined in subscription.created event
}

/**
 * Handle subscription update events
 */
async function handleSubscriptionUpdate(subscription) {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const priceId = subscription.items.data[0].price.id;

    console.log(`🔄 Subscription ${subscriptionId} status: ${status}, customer: ${customerId}, price: ${priceId}`);

    // Determine plan type
    let planType = 'individual';
    let tier = 'premium';

    if (priceId === PRICE_IDS.individual_annual) {
        planType = 'annual';
        tier = 'annual';
    } else if (priceId === PRICE_IDS.church_monthly) {
        planType = 'church';
        tier = 'church';
    }

    console.log(`📋 Determined plan: ${planType}, tier: ${tier}`);

    // Get user by Stripe customer ID
    const user = await db.query(
        'SELECT * FROM users WHERE stripe_customer_id = $1',
        [customerId]
    );

    if (!user.rows[0]) {
        console.error(`❌ User not found for customer: ${customerId}`);
        return;
    }

    const userId = user.rows[0].id;
    console.log(`👤 Found user ID: ${userId}`);

    // Update user tier
    await db.query(
        'UPDATE users SET tier = $1 WHERE id = $2',
        [tier, userId]
    );
    console.log(`✅ User tier updated to: ${tier}`);

    // Create subscription record directly (not using subquery)
    try {
        await db.query(
            `INSERT INTO subscriptions
             (user_id, stripe_subscription_id, stripe_price_id, plan_type, status,
              current_period_start, current_period_end, trial_start, trial_end)
             VALUES ($1, $2, $3, $4, $5, to_timestamp($6), to_timestamp($7),
                     to_timestamp($8), to_timestamp($9))
             ON CONFLICT (stripe_subscription_id) DO UPDATE
             SET status = $5,
                 current_period_start = to_timestamp($6),
                 current_period_end = to_timestamp($7),
                 updated_at = NOW()`,
            [
                userId,
                subscriptionId,
                priceId,
                planType,
                status,
                subscription.current_period_start,
                subscription.current_period_end,
                subscription.trial_start || null,
                subscription.trial_end || null
            ]
        );
        console.log(`✅ Subscription record created/updated for user ${userId}`);
    } catch (subError) {
        console.error(`❌ Failed to upsert subscription:`, subError.message);
        throw subError;
    }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;

    console.log(`❌ Subscription deleted: ${subscriptionId}`);

    // Get user
    const user = await db.query(
        'SELECT * FROM users WHERE stripe_customer_id = $1',
        [customerId]
    );

    if (!user.rows[0]) {
        console.error(`❌ User not found for customer: ${customerId}`);
        return;
    }

    const userId = user.rows[0].id;

    // Downgrade to free tier
    await db.query(
        'UPDATE users SET tier = $1 WHERE id = $2',
        ['free', userId]
    );

    // Update subscription status
    await db.query(
        'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
        ['canceled', subscriptionId]
    );

    console.log(`⬇️ User ${userId} downgraded to free tier`);
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log(`💰 Payment succeeded: ${invoice.id}`);

    // Log payment to payment_history
    const customerId = invoice.customer;
    const user = await db.query(
        'SELECT * FROM users WHERE stripe_customer_id = $1',
        [customerId]
    );

    if (user.rows[0]) {
        await db.query(
            `INSERT INTO payment_history
             (user_id, stripe_invoice_id, amount, currency, status, payment_type, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                user.rows[0].id,
                invoice.id,
                invoice.amount_paid / 100, // Convert cents to dollars
                invoice.currency,
                'succeeded',
                'subscription',
                invoice.lines.data[0]?.description || 'Subscription payment'
            ]
        );
    }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
    console.log(`⚠️ Payment failed: ${invoice.id}`);

    // Stripe automatically handles retry logic
    // You could send a notification email here if desired
}

/**
 * Get tier limits
 * @param {string} tier - User tier
 * @returns {Object} Tier limits
 */
function getTierLimits(tier) {
    switch (tier) {
        case 'free':
            return {
                monthlyLimit: 3,
                period: '45 days',
                overageAllowed: false
            };
        case 'premium':
            // Individual monthly: 4 per month + $4.99 overage
            return {
                monthlyLimit: 4,
                period: 'monthly',
                overageAllowed: true,
                overagePrice: 4.99
            };
        case 'annual':
            // Annual: 48 per year (4/month equivalent) + $4.99 overage
            return {
                monthlyLimit: 4,  // Still enforce 4/month to prevent binge usage
                yearlyLimit: 48,
                period: 'yearly',
                overageAllowed: true,
                overagePrice: 4.99
            };
        case 'church':
            // Church/Ministry: Unlimited
            return {
                monthlyLimit: Infinity,
                period: 'monthly',
                overageAllowed: false
            };
        default:
            return {
                monthlyLimit: 0,
                period: 'none',
                overageAllowed: false
            };
    }
}

/**
 * Verify subscription status directly with Stripe
 * Used when returning from checkout to handle webhook race condition
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object|null>} Subscription info or null
 */
async function verifySubscriptionStatus(customerId) {
    try {
        if (!customerId) return null;

        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) return null;

        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0].price.id;

        // Determine tier from price ID
        let tier = 'premium';
        let planType = 'individual';

        if (priceId === PRICE_IDS.individual_annual) {
            tier = 'annual';
            planType = 'annual';
        } else if (priceId === PRICE_IDS.church_monthly) {
            tier = 'church';
            planType = 'church';
        }

        return {
            subscriptionId: subscription.id,
            status: subscription.status,
            tier: tier,
            planType: planType,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        };
    } catch (error) {
        console.error('Error verifying subscription status:', error);
        return null;
    }
}

/**
 * Get customer by email (for syncing after checkout)
 * @param {string} email - Customer email
 * @returns {Promise<Object|null>} Customer object or null
 */
async function getCustomerByEmail(email) {
    try {
        const customers = await stripe.customers.list({
            email: email,
            limit: 1
        });

        return customers.data.length > 0 ? customers.data[0] : null;
    } catch (error) {
        console.error('Error getting customer by email:', error);
        return null;
    }
}

module.exports = {
    createCheckoutSession,
    createPortalSession,
    chargeOverage,
    handleWebhook,
    getTierLimits,
    verifySubscriptionStatus,
    getCustomerByEmail,
    PRICE_IDS
};
