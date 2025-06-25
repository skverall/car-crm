-- Исправление ограничения уникальности VIN
-- Сделать VIN уникальным только в рамках одного пользователя

-- 1. Удалить старое ограничение уникальности
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_vin_key;

-- 2. Создать новое ограничение уникальности (VIN + user_id)
ALTER TABLE cars ADD CONSTRAINT cars_vin_user_unique UNIQUE (vin, user_id);

-- 3. Проверить ограничения
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'cars'::regclass;

-- 4. Теперь можно добавлять автомобили с одинаковыми VIN разными пользователями
