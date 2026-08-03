CREATE TABLE IF NOT EXISTS recharge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL,
    trx_id VARCHAR(100),
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    processed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_recharge_requests_status_date
    ON recharge_requests(status, requested_at DESC);
