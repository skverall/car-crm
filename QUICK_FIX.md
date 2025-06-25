# 🚨 Быстрое исправление проблемы с добавлением автомобилей

## Проблема
- Ошибка "An error occurred" при добавлении автомобиля
- Ошибка загрузки профиля пользователя

## Решение (выполните по порядку)

### Шаг 1: Проверьте состояние базы данных
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте и выполните код из файла `debug_migration.sql`

### Шаг 2: Примените миграцию
Скопируйте и выполните этот код в SQL Editor **по частям**:

#### Часть 1: Добавить user_id в таблицу cars
```sql
-- Добавить колонку user_id (если не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cars' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE cars ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;
```

#### Часть 2: Удалить существующие автомобили без владельца
```sql
-- Удалить тестовые данные без user_id
DELETE FROM cars WHERE user_id IS NULL;
```

#### Часть 3: Создать таблицу профилей пользователей
```sql
-- Создать таблицу user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'importer',
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Часть 4: Включить Row Level Security
```sql
-- Включить RLS для cars
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Включить RLS для user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

#### Часть 5: Создать политики безопасности
```sql
-- Политики для cars
CREATE POLICY "Users can view own cars" ON cars
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cars" ON cars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cars" ON cars
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cars" ON cars
    FOR DELETE USING (auth.uid() = user_id);

-- Политика для user_profiles
CREATE POLICY "Users can manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);
```

#### Часть 6: Обновить представление car_profit_analysis
```sql
-- Пересоздать представление с user_id
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
```

### Шаг 3: Проверьте результат
1. Обновите страницу приложения
2. В правом нижнем углу должен появиться блок "Debug Info"
3. Убедитесь, что показано:
   - User: Logged in
   - Profile: Found

### Шаг 4: Тестирование
1. Попробуйте добавить автомобиль
2. Если ошибка сохраняется, откройте консоль браузера (F12) и сообщите об ошибке

## Если ничего не помогает
Временно отключите проверку user_id:
1. Откройте файл `src/components/AddCarModal.tsx`
2. Найдите строку `user_id: user.id,`
3. Закомментируйте её: `// user_id: user.id,`
4. Сохраните файл

Это позволит добавлять автомобили без изоляции пользователей (временное решение).
