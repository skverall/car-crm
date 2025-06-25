-- Создать профиль для текущего пользователя
-- Выполните этот код в SQL Editor после входа в систему

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

-- Проверить результат
SELECT * FROM user_profiles WHERE id = auth.uid();
