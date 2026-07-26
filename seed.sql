-- ==============================================================================
-- MEAL MANAGEMENT APP - DEMO SEED DATA (PLUG & PLAY)
-- Quick test dataset: 1 Admin, 2 Approved Users (Permanent & Guest), 1 Pending User
-- ==============================================================================

-- 1. Insert Initial Admin & Users
-- Passwords below are hashed representations for 'password123'
INSERT INTO users (id, phone_number, password_hash, full_name, role, user_type, approval_status, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '+8801700000001', '$2a$10$wT5iG0q/5kC8T7kP7eXy0e1234567890abcdefghijklm', 'Super Admin', 'ADMIN', 'PERMANENT', 'APPROVED', true),
    ('22222222-2222-2222-2222-222222222222', '+8801700000002', '$2a$10$wT5iG0q/5kC8T7kP7eXy0e1234567890abcdefghijklm', 'Rafiqul Islam', 'USER', 'PERMANENT', 'APPROVED', true),
    ('33333333-3333-3333-3333-333333333333', '+8801700000003', '$2a$10$wT5iG0q/5kC8T7kP7eXy0e1234567890abcdefghijklm', 'Tanvir Ahmed (Guest)', 'USER', 'GUEST', 'APPROVED', true),
    ('44444444-4444-4444-4444-444444444444', '+8801700000004', '$2a$10$wT5iG0q/5kC8T7kP7eXy0e1234567890abcdefghijklm', 'Karim Hossain', 'USER', 'PERMANENT', 'PENDING', true)
ON CONFLICT (phone_number) DO NOTHING;

-- 2. Insert User Profiles
INSERT INTO profiles (user_id, room_number, department, batch, hostel_name)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin-1', 'Administration', '2020', 'Main Hostel'),
    ('22222222-2222-2222-2222-222222222222', '302-A', 'Computer Science', '2022', 'Main Hostel'),
    ('33333333-3333-3333-3333-333333333333', '104-B', 'Electrical Eng.', '2023', 'Guest Wing'),
    ('44444444-4444-4444-4444-444444444444', '201-C', 'Mechanical Eng.', '2024', 'Main Hostel')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Initialize Wallets
INSERT INTO wallets (user_id, current_balance, currency)
VALUES
    ('11111111-1111-1111-1111-111111111111', 5000.00, 'BDT'),
    ('22222222-2222-2222-2222-222222222222', 1500.00, 'BDT'),
    ('33333333-3333-3333-3333-333333333333', 800.00, 'BDT'),
    ('44444444-4444-4444-4444-444444444444', 0.00, 'BDT')
ON CONFLICT (user_id) DO NOTHING;

-- 4. Initial Pricing Setup (Permanent vs Guest Rates)
INSERT INTO meal_prices (user_type, meal_type, price, effective_from)
VALUES
    ('PERMANENT', 'BREAKFAST', 35.00, CURRENT_DATE),
    ('PERMANENT', 'LUNCH', 65.00, CURRENT_DATE),
    ('PERMANENT', 'DINNER', 60.00, CURRENT_DATE),
    ('GUEST', 'BREAKFAST', 50.00, CURRENT_DATE),
    ('GUEST', 'LUNCH', 90.00, CURRENT_DATE),
    ('GUEST', 'DINNER', 85.00, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- 5. Monthly Charges Setup
INSERT INTO monthly_charges (user_type, month, year, monthly_amount)
VALUES
    ('PERMANENT', 7, 2026, 500.00),
    ('GUEST', 7, 2026, 200.00)
ON CONFLICT DO NOTHING;

-- 6. Today's Global Meal Setting
INSERT INTO meal_settings (meal_date, breakfast_on, lunch_on, dinner_on, emergency_off)
VALUES (CURRENT_DATE, true, true, true, false)
ON CONFLICT (meal_date) DO NOTHING;

-- 7. Sample Meal Declaration for Approved Users
INSERT INTO meal_declarations (user_id, declaration_date, breakfast_selected, lunch_selected, dinner_selected, source_type)
VALUES
    ('22222222-2222-2222-2222-222222222222', CURRENT_DATE, true, true, true, 'MANUAL'),
    ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, false, true, true, 'MANUAL')
ON CONFLICT (user_id, declaration_date) DO NOTHING;
