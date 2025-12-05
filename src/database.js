/**
 * BibleOps Premium - Database Connection
 * PostgreSQL connection pool using pg library
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false // Required for Render.com and most cloud PostgreSQL
    } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error if connection takes > 2 seconds
});

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:', err);
    process.exit(-1);
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

/**
 * Query helper with error handling
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} - Query result
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries (> 1 second)
        if (duration > 1000) {
            console.warn(`⚠️ Slow query (${duration}ms):`, text);
        }

        return res;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('Query:', text);
        console.error('Params:', params);
        throw error;
    }
}

/**
 * Transaction helper
 * @param {Function} callback - Function containing queries to run in transaction
 * @returns {Promise<any>} - Result of callback
 */
async function transaction(callback) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW() as now');
        console.log('📊 Database connection test successful:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
    }
}

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function getUserByEmail(email) {
    const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
}

/**
 * Create free user (no password required)
 * @param {string} email
 * @returns {Promise<Object>}
 */
async function createFreeUser(email) {
    const result = await query(
        `INSERT INTO users (email, password_hash, tier, free_trial_start)
         VALUES ($1, NULL, 'free', NOW())
         RETURNING id, email, tier, created_at, free_trial_start`,
        [email]
    );
    return result.rows[0];
}

/**
 * Get user by ID
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
async function getUserById(userId) {
    const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

/**
 * Create new user
 * @param {string} email
 * @param {string} passwordHash
 * @returns {Promise<Object>}
 */
async function createUser(email, passwordHash) {
    const result = await query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [email, passwordHash]
    );
    return result.rows[0];
}

/**
 * Update user's Stripe customer ID
 * @param {number} userId
 * @param {string} stripeCustomerId
 */
async function updateUserStripeCustomerId(userId, stripeCustomerId) {
    await query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, userId]
    );
}

/**
 * Upgrade user from free to premium
 * @param {string} email
 * @param {string} passwordHash
 * @param {string} tier - 'premium', 'annual', or 'church'
 * @param {string} stripeCustomerId
 */
async function upgradeUserToPremium(email, passwordHash, tier, stripeCustomerId) {
    await query(
        `UPDATE users
         SET password_hash = $1,
             tier = $2,
             stripe_customer_id = $3,
             updated_at = NOW()
         WHERE email = $4`,
        [passwordHash, tier, stripeCustomerId, email]
    );
}

/**
 * Get free tier usage count (last 45 days)
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function getFreeUsageCount(userId) {
    const result = await query(
        `SELECT COUNT(*) as count
         FROM curriculum_generations
         WHERE user_id = $1
         AND tier_at_generation = 'free'
         AND created_at >= NOW() - INTERVAL '45 days'
         AND status = 'completed'`,
        [userId]
    );
    return parseInt(result.rows[0].count);
}

/**
 * Get active subscription for user
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
async function getActiveSubscription(userId) {
    const result = await query(
        `SELECT * FROM subscriptions
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
}

/**
 * Get usage count for current billing period
 * @param {number} userId
 * @param {Date} periodStart
 * @returns {Promise<number>}
 */
async function getUsageCount(userId, periodStart) {
    const result = await query(
        `SELECT COUNT(*) as count
         FROM curriculum_generations
         WHERE user_id = $1
         AND billing_period_start = $2
         AND status = 'completed'`,
        [userId, periodStart]
    );
    return parseInt(result.rows[0].count);
}

/**
 * Get overage count for current billing period
 * @param {number} userId
 * @param {Date} periodStart
 * @returns {Promise<number>}
 */
async function getOverageCount(userId, periodStart) {
    const result = await query(
        `SELECT COUNT(*) as count
         FROM curriculum_generations
         WHERE user_id = $1
         AND billing_period_start = $2
         AND is_overage = TRUE
         AND status = 'completed'`,
        [userId, periodStart]
    );
    return parseInt(result.rows[0].count);
}

/**
 * Create curriculum generation record
 * @param {Object} data - Generation data
 * @returns {Promise<Object>}
 */
async function createGeneration(data) {
    const result = await query(
        `INSERT INTO curriculum_generations
         (user_id, job_id, study_focus, passage, theme, book_title, book_author,
          denomination, bible_version, age_group, billing_period_start, billing_period_end,
          is_overage, overage_charge_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
            data.userId, data.jobId, data.studyFocus, data.passage, data.theme,
            data.bookTitle, data.bookAuthor, data.denomination, data.bibleVersion,
            data.ageGroup, data.billingPeriodStart, data.billingPeriodEnd,
            data.isOverage, data.overageChargeAmount, data.status || 'pending'
        ]
    );
    return result.rows[0];
}

/**
 * Update generation status
 * @param {string} jobId
 * @param {string} status - 'processing', 'completed', 'failed'
 * @param {string} errorMessage - Optional error message
 */
async function updateGenerationStatus(jobId, status, errorMessage = null) {
    const now = new Date();

    if (status === 'completed') {
        await query(
            `UPDATE curriculum_generations
             SET status = $1, completed_at = $2
             WHERE job_id = $3`,
            [status, now, jobId]
        );
    } else if (status === 'failed') {
        await query(
            `UPDATE curriculum_generations
             SET status = $1, failed_at = $2, error_message = $3
             WHERE job_id = $4`,
            [status, now, errorMessage, jobId]
        );
    } else {
        await query(
            `UPDATE curriculum_generations
             SET status = $1
             WHERE job_id = $2`,
            [status, jobId]
        );
    }
}

/**
 * Get generation history for user
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getGenerationHistory(userId, limit = 20) {
    const result = await query(
        `SELECT * FROM curriculum_generations
         WHERE user_id = $1
         AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}

/**
 * Create or update subscription
 * @param {Object} data - Subscription data from Stripe
 */
async function upsertSubscription(data) {
    await query(
        `INSERT INTO subscriptions
         (user_id, stripe_subscription_id, stripe_price_id, plan_type, status,
          current_period_start, current_period_end, trial_start, trial_end)
         VALUES (
             (SELECT id FROM users WHERE stripe_customer_id = $1),
             $2, $3, $4, $5, to_timestamp($6), to_timestamp($7),
             to_timestamp($8), to_timestamp($9)
         )
         ON CONFLICT (stripe_subscription_id) DO UPDATE
         SET status = $5,
             current_period_start = to_timestamp($6),
             current_period_end = to_timestamp($7),
             updated_at = NOW()`,
        [
            data.customerId,
            data.subscriptionId,
            data.priceId,
            data.planType || 'individual',
            data.status,
            data.currentPeriodStart,
            data.currentPeriodEnd,
            data.trialStart || null,
            data.trialEnd || null
        ]
    );
}

/**
 * Log webhook event
 * @param {string} eventId
 * @param {string} eventType
 * @param {Object} payload
 */
async function logWebhookEvent(eventId, eventType, payload) {
    await query(
        `INSERT INTO webhook_events (stripe_event_id, event_type, payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (stripe_event_id) DO NOTHING`,
        [eventId, eventType, payload]
    );
}

/**
 * Mark webhook as processed
 * @param {string} eventId
 */
async function markWebhookProcessed(eventId) {
    await query(
        `UPDATE webhook_events
         SET processed = TRUE, processed_at = NOW()
         WHERE stripe_event_id = $1`,
        [eventId]
    );
}

/**
 * Update generation with S3 keys after PDF upload
 * @param {string} jobId - The job ID
 * @param {Array} s3Keys - Array of {title, filename, s3Key}
 */
async function updateGenerationS3Keys(jobId, s3Keys) {
    await query(
        `UPDATE curriculum_generations
         SET s3_keys = $1
         WHERE job_id = $2`,
        [JSON.stringify(s3Keys), jobId]
    );
}

/**
 * Get generation by job ID (for downloads)
 * @param {number} userId - User ID (for authorization)
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>}
 */
async function getGenerationByJobId(userId, jobId) {
    const result = await query(
        `SELECT * FROM curriculum_generations
         WHERE user_id = $1 AND job_id = $2`,
        [userId, jobId]
    );
    return result.rows[0] || null;
}

// Export pool and helper functions
module.exports = {
    pool,
    query,
    transaction,
    testConnection,
    getUserByEmail,
    getUserById,
    createUser,
    createFreeUser,
    updateUserStripeCustomerId,
    upgradeUserToPremium,
    getFreeUsageCount,
    getActiveSubscription,
    getUsageCount,
    getOverageCount,
    createGeneration,
    updateGenerationStatus,
    updateGenerationS3Keys,
    getGenerationHistory,
    getGenerationByJobId,
    upsertSubscription,
    logWebhookEvent,
    markWebhookProcessed
};
