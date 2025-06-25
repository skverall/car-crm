-- ПОЛНАЯ ОЧИСТКА И НАСТРОЙКА БАЗЫ ДАННЫХ
-- ВНИМАНИЕ: Это удалит ВСЕ автомобили и связанные данные!
-- Используйте только если готовы потерять все данные

-- 1. Отключить RLS временно
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;

-- 2. Удалить все данные
DELETE FROM expenses;
DELETE FROM debts;
DELETE FROM cars;

-- 3. Исправить ограничения
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_vin_key;
ALTER TABLE cars ADD CONSTRAINT cars_vin_user_unique UNIQUE (vin, user_id);

-- 4. Убедиться что user_id существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cars' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE cars ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Создать таблицу профилей если не существует
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'importer',
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Включить RLS
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 7. Создать политики для cars
DROP POLICY IF EXISTS "Users can view own cars" ON cars;
DROP POLICY IF EXISTS "Users can insert own cars" ON cars;
DROP POLICY IF EXISTS "Users can update own cars" ON cars;
DROP POLICY IF EXISTS "Users can delete own cars" ON cars;

CREATE POLICY "Users can view own cars" ON cars
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cars" ON cars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cars" ON cars
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cars" ON cars
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Создать политики для expenses
DROP POLICY IF EXISTS "Users can manage expenses for own cars" ON expenses;

CREATE POLICY "Users can manage expenses for own cars" ON expenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cars 
            WHERE cars.id = expenses.car_id 
            AND cars.user_id = auth.uid()
        )
    );

-- 9. Создать политики для user_profiles
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;

CREATE POLICY "Users can manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

-- 10. Пересоздать представление
DROP VIEW IF EXISTS car_profit_analysis;

CREATE VIEW car_profit_analysis AS
SELECT 
    c.id,
    c.user_id,
    c.vin,
    c.make,
    c.model,
    c.year,
    c.status,
    c.purchase_price,
    c.purchase_currency,
    c.sale_price,
    c.sale_currency,
    COALESCE(SUM(e.amount * CASE 
        WHEN e.currency = 'AED' THEN 1
        WHEN e.currency = 'USD' THEN 3.67
        WHEN e.currency = 'EUR' THEN 4.00
        WHEN e.currency = 'GBP' THEN 4.60
        ELSE 1
    END), 0) AS total_expenses_aed,
    CASE 
        WHEN c.status = 'sold' THEN 
            (c.sale_price * CASE 
                WHEN c.sale_currency = 'AED' THEN 1
                WHEN c.sale_currency = 'USD' THEN 3.67
                WHEN c.sale_currency = 'EUR' THEN 4.00
                WHEN c.sale_currency = 'GBP' THEN 4.60
                ELSE 1
            END) - 
            (c.purchase_price * CASE 
                WHEN c.purchase_currency = 'AED' THEN 1
                WHEN c.purchase_currency = 'USD' THEN 3.67
                WHEN c.purchase_currency = 'EUR' THEN 4.00
                WHEN c.purchase_currency = 'GBP' THEN 4.60
                ELSE 1
            END) - 
            COALESCE(SUM(e.amount * CASE 
                WHEN e.currency = 'AED' THEN 1
                WHEN e.currency = 'USD' THEN 3.67
                WHEN e.currency = 'EUR' THEN 4.00
                WHEN e.currency = 'GBP' THEN 4.60
                ELSE 1
            END), 0)
        ELSE NULL
    END AS profit_aed,
    c.purchase_date,
    c.sale_date,
    CASE 
        WHEN c.status = 'sold' AND c.sale_date IS NOT NULL THEN 
            c.sale_date - c.purchase_date
        ELSE NULL
    END AS days_to_sell
FROM cars c
LEFT JOIN expenses e ON c.id = e.car_id
GROUP BY c.id, c.user_id, c.vin, c.make, c.model, c.year, c.status, 
         c.purchase_price, c.purchase_currency, c.sale_price, c.sale_currency,
         c.purchase_date, c.sale_date;

-- 11. Создать профиль для текущего пользователя
INSERT INTO user_profiles (id, role, full_name)
SELECT 
    auth.uid(),
    'importer',
    COALESCE(
        (auth.jwt() ->> 'user_metadata')::json ->> 'full_name',
        (auth.jwt() ->> 'email'),
        'User'
    )
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid()
);

-- 12. Проверить результат
SELECT 'Setup complete!' as status;
SELECT COUNT(*) as total_cars FROM cars;
SELECT * FROM user_profiles WHERE id = auth.uid();
