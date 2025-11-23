-- BibleOps Premium Database Schema
-- PostgreSQL 12+
-- Created: 2025-11-23

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    stripe_customer_id VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'individual', -- 'individual', 'annual', 'church'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', 'incomplete'
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Ensure one active subscription per user
CREATE UNIQUE INDEX idx_one_active_subscription_per_user
ON subscriptions(user_id)
WHERE status = 'active';

-- ============================================
-- CURRICULUM GENERATIONS TABLE
-- ============================================

CREATE TABLE curriculum_generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id VARCHAR(255) UNIQUE NOT NULL,

    -- Study details
    study_focus VARCHAR(50) NOT NULL, -- 'passage', 'theme', 'book'
    passage TEXT,
    theme TEXT,
    book_title TEXT,
    book_author TEXT,
    denomination VARCHAR(100),
    bible_version VARCHAR(50),
    age_group VARCHAR(50),

    -- Billing period tracking
    billing_period_start TIMESTAMP NOT NULL,
    billing_period_end TIMESTAMP NOT NULL,
    is_overage BOOLEAN DEFAULT FALSE,
    overage_charge_amount DECIMAL(10, 2), -- $4.99 if overage
    stripe_payment_intent_id VARCHAR(255), -- For overage charges

    -- Generation status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,

    -- S3 storage
    s3_folder VARCHAR(255), -- S3 folder path where PDFs are stored
    pdf_count INTEGER DEFAULT 0, -- Number of PDFs generated

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_curriculum_user_id ON curriculum_generations(user_id);
CREATE INDEX idx_curriculum_job_id ON curriculum_generations(job_id);
CREATE INDEX idx_curriculum_billing_period ON curriculum_generations(user_id, billing_period_start);
CREATE INDEX idx_curriculum_status ON curriculum_generations(status);
CREATE INDEX idx_curriculum_created_at ON curriculum_generations(created_at DESC);

-- ============================================
-- PDF FILES TABLE
-- ============================================

CREATE TABLE pdf_files (
    id SERIAL PRIMARY KEY,
    generation_id INTEGER NOT NULL REFERENCES curriculum_generations(id) ON DELETE CASCADE,
    component_name VARCHAR(100) NOT NULL, -- 'foundation', 'theology', 'studentGuide', etc.
    component_title TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    s3_key TEXT NOT NULL, -- Full S3 path
    file_size_bytes INTEGER,
    download_url TEXT, -- Presigned URL (expires)
    url_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pdf_files_generation_id ON pdf_files(generation_id);
CREATE INDEX idx_pdf_files_s3_key ON pdf_files(s3_key);

-- ============================================
-- PAYMENT HISTORY TABLE
-- ============================================

CREATE TABLE payment_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_invoice_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- 'succeeded', 'pending', 'failed'
    payment_type VARCHAR(50) NOT NULL, -- 'subscription', 'overage', 'one_time'
    description TEXT,
    generation_id INTEGER REFERENCES curriculum_generations(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_stripe_payment_intent ON payment_history(stripe_payment_intent_id);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at DESC);

-- ============================================
-- WEBHOOK EVENTS TABLE (For debugging/auditing)
-- ============================================

CREATE TABLE webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to subscriptions table
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Active subscriptions with user info
CREATE VIEW active_subscriptions AS
SELECT
    s.*,
    u.email,
    u.stripe_customer_id
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active';

-- View: Monthly usage by user
CREATE VIEW monthly_usage AS
SELECT
    user_id,
    billing_period_start,
    billing_period_end,
    COUNT(*) as total_generations,
    SUM(CASE WHEN is_overage = TRUE THEN 1 ELSE 0 END) as overage_count,
    SUM(CASE WHEN is_overage = TRUE THEN overage_charge_amount ELSE 0 END) as total_overage_charges
FROM curriculum_generations
WHERE status = 'completed'
GROUP BY user_id, billing_period_start, billing_period_end;

-- ============================================
-- SAMPLE QUERIES (For Testing)
-- ============================================

-- Get user's current subscription
-- SELECT * FROM subscriptions WHERE user_id = 1 AND status = 'active';

-- Get user's usage for current billing period
-- SELECT * FROM curriculum_generations
-- WHERE user_id = 1
-- AND billing_period_start = '2025-11-01'
-- AND status = 'completed';

-- Count overages for current period
-- SELECT COUNT(*) FROM curriculum_generations
-- WHERE user_id = 1
-- AND billing_period_start = '2025-11-01'
-- AND is_overage = TRUE;

-- Get all PDFs for a generation
-- SELECT * FROM pdf_files WHERE generation_id = 1;

-- ============================================
-- SEED DATA (For Testing - REMOVE IN PRODUCTION)
-- ============================================

-- Test user (password: 'password123')
-- INSERT INTO users (email, password_hash, email_verified, stripe_customer_id)
-- VALUES ('test@bibleops.com', '$2b$10$...' ,'TRUE', 'cus_test123');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User accounts for BibleOps Premium';
COMMENT ON TABLE subscriptions IS 'Stripe subscription records';
COMMENT ON TABLE curriculum_generations IS 'Track all curriculum generations for billing and history';
COMMENT ON TABLE pdf_files IS 'Individual PDF files for each generation';
COMMENT ON TABLE payment_history IS 'All payment transactions';
COMMENT ON TABLE webhook_events IS 'Stripe webhook event log for debugging';

-- ============================================
-- SECURITY
-- ============================================

-- Revoke public access (if needed in production)
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- Grant access only to app user (replace 'bibleops_app' with your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bibleops_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bibleops_app;
