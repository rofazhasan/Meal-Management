-- Migration 005: Add Notifications Table & Performance Indexes for Data Centralization

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_status_deleted ON users(approval_status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_meal_dec_date ON meal_declarations(declaration_date);
CREATE INDEX IF NOT EXISTS idx_meal_dec_user_date ON meal_declarations(user_id, declaration_date);

CREATE INDEX IF NOT EXISTS idx_meal_cons_date_type ON meal_consumptions(meal_date, meal_type);

CREATE INDEX IF NOT EXISTS idx_approval_req_status_created ON approval_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_approval_req_user ON approval_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_special_meals_date_active ON special_meals(meal_date, is_active);
