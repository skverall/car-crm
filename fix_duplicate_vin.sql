-- Исправление проблемы с дублированием VIN
-- Выполните этот код в Supabase SQL Editor

-- 1. Проверить все автомобили в базе (включая скрытые RLS)
SELECT id, vin, user_id, make, model, year, created_at 
FROM cars 
ORDER BY created_at DESC;

-- 2. Временно отключить RLS для очистки данных
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;

-- 3. Удалить все автомобили без user_id
DELETE FROM cars WHERE user_id IS NULL;

-- 4. Удалить все автомобили (если нужно полная очистка)
-- ВНИМАНИЕ: Это удалит ВСЕ автомобили!
-- Раскомментируйте следующую строку только если хотите удалить все данные:
-- DELETE FROM cars;

-- 5. Включить RLS обратно
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- 6. Проверить результат
SELECT COUNT(*) as total_cars FROM cars;

-- 7. Проверить текущего пользователя
SELECT auth.uid() as current_user_id;

-- 8. Создать профиль пользователя если его нет
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
