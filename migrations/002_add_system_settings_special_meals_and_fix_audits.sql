CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS special_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_date DATE NOT NULL,
    meal_type meal_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    custom_rate NUMERIC(12, 2) NOT NULL CHECK (custom_rate >= 0),
    description TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_day_of_week SMALLINT CHECK (repeat_day_of_week BETWEEN 0 AND 6),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;

CREATE INDEX IF NOT EXISTS idx_special_meals_date_type
    ON special_meals(meal_date, meal_type, is_active);
