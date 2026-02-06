-- ============================================================================
-- IMPERION: ПОЛНЫЙ СКРИПТ БАЗЫ ДАННЫХ
-- ============================================================================
-- Версия: 2.0
-- Дата: 2026
-- Описание: Полная пересоздаваемая база данных для платформы Imperion
-- 
-- ВАЖНО: Этот скрипт полностью пересоздаёт схему public при каждом запуске.
-- Все данные будут удалены и пересозданы.
-- ============================================================================

-- ============================================================================
-- ЧАСТЬ 1: ОЧИСТКА И ПОДГОТОВКА
-- ============================================================================

-- Удаляем все существующие политики storage
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Удаляем триггер на auth.users (если существует)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Удаляем существующую схему public и пересоздаём
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Устанавливаем права на схему
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Комментарий к схеме
COMMENT ON SCHEMA public IS 'Imperion: Образовательная платформа для изучения программирования';

-- ============================================================================
-- ЧАСТЬ 2: РАСШИРЕНИЯ
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================================
-- ЧАСТЬ 3: ПОЛЬЗОВАТЕЛЬСКИЕ ТИПЫ (ENUM)
-- ============================================================================

-- Тип урока: теория, практика, экзамен
CREATE TYPE public.lesson_type AS ENUM ('theory', 'practice', 'exam');

-- Уровень сложности
CREATE TYPE public.difficulty AS ENUM ('лёгкий', 'средний', 'сложный');

-- Поддерживаемые языки программирования
CREATE TYPE public.programming_language AS ENUM ('python', 'javascript', 'cpp', 'c', 'go');

-- Статус прогресса
CREATE TYPE public.progress_status AS ENUM ('не_начат', 'в_процессе', 'завершён');

-- Редкость достижения
CREATE TYPE public.achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- Роли пользователей
CREATE TYPE public.user_role AS ENUM ('пользователь', 'ментор', 'администратор');

-- ============================================================================
-- ЧАСТЬ 4: ТАБЛИЦЫ
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
-- ----------------------------------------------------------------------------
-- ПРИМЕЧАНИЕ: Email хранится в auth.users и уникален автоматически (Supabase Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(50) UNIQUE, -- Уникальный логин пользователя
    avatar_url TEXT,
    bio VARCHAR(500),
    role public.user_role NOT NULL DEFAULT 'пользователь',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT profiles_username_length CHECK (
        username IS NULL OR (LENGTH(username) >= 3 AND LENGTH(username) <= 50)
    ),
    CONSTRAINT profiles_username_format CHECK (
        username IS NULL OR username ~ '^[a-zA-Z0-9]+$'
    ),
    CONSTRAINT profiles_first_name_length CHECK (first_name IS NULL OR LENGTH(first_name) >= 1),
    CONSTRAINT profiles_last_name_length CHECK (last_name IS NULL OR LENGTH(last_name) >= 1),
    CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR LENGTH(bio) <= 500)
);

COMMENT ON TABLE public.profiles IS 'Профили пользователей платформы';
COMMENT ON COLUMN public.profiles.username IS 'Уникальный логин (3-50 символов, только латиница и цифры)';
COMMENT ON COLUMN public.profiles.role IS 'Роль пользователя: пользователь, ментор, администратор';

-- ----------------------------------------------------------------------------
-- 4.2 НАСТРОЙКИ ПОЛЬЗОВАТЕЛЕЙ
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    language_code VARCHAR(5) NOT NULL DEFAULT 'ru' CHECK (language_code IN ('ru', 'en')),
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_settings IS 'Пользовательские настройки интерфейса';

-- ----------------------------------------------------------------------------
-- 4.3 ОПЫТ ПОЛЬЗОВАТЕЛЕЙ (XP)
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_xp (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_xp IS 'Опыт и уровень пользователей';

-- ----------------------------------------------------------------------------
-- 4.4 СЕРИИ (STREAKS)
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    last_activity_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_streaks IS 'Серии ежедневной активности пользователей';

-- ----------------------------------------------------------------------------
-- 4.5 УРОКИ
-- ----------------------------------------------------------------------------
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type public.lesson_type NOT NULL,
    difficulty public.difficulty NOT NULL,
    language public.programming_language NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT lessons_slug_length CHECK (LENGTH(slug) >= 3),
    CONSTRAINT lessons_title_length CHECK (LENGTH(title) >= 3)
);

CREATE INDEX lessons_language_difficulty_idx ON public.lessons (language, difficulty);
CREATE INDEX lessons_published_order_idx ON public.lessons (published, order_index);

COMMENT ON TABLE public.lessons IS 'Практические уроки платформы';

-- ----------------------------------------------------------------------------
-- 4.6 ЭЛЕМЕНТЫ УРОКОВ
-- ----------------------------------------------------------------------------
CREATE TABLE public.lesson_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    content_markdown TEXT,
    starter_code TEXT,
    solution_code TEXT,
    tests JSONB NOT NULL DEFAULT '{}'::JSONB,
    max_attempts INTEGER CHECK (max_attempts IS NULL OR max_attempts > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lesson_items_lesson_id_order_idx ON public.lesson_items (lesson_id, order_index);

COMMENT ON TABLE public.lesson_items IS 'Контент и задания для уроков';
COMMENT ON COLUMN public.lesson_items.tests IS 'JSON с тестами: {expected_stdout: ""} или {test_cases: [{input, expected_output}]}';

-- ----------------------------------------------------------------------------
-- 4.7 ПОДСКАЗКИ К УРОКАМ
-- ----------------------------------------------------------------------------
CREATE TABLE public.lesson_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.lesson_items(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    hint_markdown TEXT NOT NULL,
    penalty_xp INTEGER NOT NULL DEFAULT 0 CHECK (penalty_xp >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lesson_hints_item_id_order_idx ON public.lesson_hints (item_id, order_index);

COMMENT ON TABLE public.lesson_hints IS 'Подсказки для заданий уроков';

-- ----------------------------------------------------------------------------
-- 4.8 ЛЕКЦИИ
-- ----------------------------------------------------------------------------
CREATE TABLE public.lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    language public.programming_language NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT lectures_slug_length CHECK (LENGTH(slug) >= 3),
    CONSTRAINT lectures_title_length CHECK (LENGTH(title) >= 3)
);

CREATE INDEX lectures_language_order_idx ON public.lectures (language, order_index);
CREATE INDEX lectures_published_order_idx ON public.lectures (published, order_index);

COMMENT ON TABLE public.lectures IS 'Теоретические лекции платформы';

-- ----------------------------------------------------------------------------
-- 4.9 СЕКЦИИ ЛЕКЦИЙ
-- ----------------------------------------------------------------------------
CREATE TABLE public.lecture_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    title VARCHAR(200),
    order_index INTEGER NOT NULL DEFAULT 0,
    content_markdown TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lecture_sections_lecture_id_order_idx ON public.lecture_sections (lecture_id, order_index);

COMMENT ON TABLE public.lecture_sections IS 'Секции/разделы лекций';

-- ----------------------------------------------------------------------------
-- 4.10 ТРАНЗАКЦИИ XP
-- ----------------------------------------------------------------------------
CREATE TABLE public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX xp_transactions_user_id_created_at_idx ON public.xp_transactions (user_id, created_at DESC);

COMMENT ON TABLE public.xp_transactions IS 'История начисления/списания опыта';

-- ----------------------------------------------------------------------------
-- 4.11 ПРОГРЕСС ПО УРОКАМ
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_lesson_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    status public.progress_status NOT NULL DEFAULT 'не_начат',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    best_score NUMERIC(5,2) CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 100)),
    last_attempt_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX user_lesson_progress_user_id_status_idx ON public.user_lesson_progress (user_id, status);

COMMENT ON TABLE public.user_lesson_progress IS 'Прогресс пользователей по урокам';

-- ----------------------------------------------------------------------------
-- 4.12 ПРОГРЕСС ПО ЭЛЕМЕНТАМ УРОКОВ
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_lesson_item_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.lesson_items(id) ON DELETE CASCADE,
    status public.progress_status NOT NULL DEFAULT 'не_начат',
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

COMMENT ON TABLE public.user_lesson_item_progress IS 'Прогресс пользователей по элементам уроков';

-- ----------------------------------------------------------------------------
-- 4.13 ПРОГРЕСС ПО ЛЕКЦИЯМ
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_lecture_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    last_section_id UUID REFERENCES public.lecture_sections(id) ON DELETE SET NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lecture_id)
);

COMMENT ON TABLE public.user_lecture_progress IS 'Прогресс пользователей по лекциям';

-- ----------------------------------------------------------------------------
-- 4.14 ОТПРАВКИ КОДА
-- ----------------------------------------------------------------------------
CREATE TABLE public.code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.lesson_items(id) ON DELETE SET NULL,
    language public.programming_language NOT NULL,
    code TEXT NOT NULL,
    stdin TEXT,
    piston_result JSONB NOT NULL DEFAULT '{}'::JSONB,
    passed BOOLEAN,
    score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX code_submissions_user_id_created_at_idx ON public.code_submissions (user_id, created_at DESC);
CREATE INDEX code_submissions_lesson_id_created_at_idx ON public.code_submissions (lesson_id, created_at DESC);

COMMENT ON TABLE public.code_submissions IS 'История отправок кода пользователей';

-- ----------------------------------------------------------------------------
-- 4.15 ИСПОЛЬЗОВАНИЕ ПОДСКАЗОК
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_hint_usage (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hint_id UUID NOT NULL REFERENCES public.lesson_hints(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, hint_id)
);

COMMENT ON TABLE public.user_hint_usage IS 'Учёт использования подсказок';

-- ----------------------------------------------------------------------------
-- 4.16 ДОСТИЖЕНИЯ
-- ----------------------------------------------------------------------------
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    rarity public.achievement_rarity NOT NULL DEFAULT 'common',
    icon TEXT,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    criteria_type VARCHAR(50),
    criteria JSONB NOT NULL DEFAULT '{}'::JSONB,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.achievements IS 'Каталог достижений платформы';

-- ----------------------------------------------------------------------------
-- 4.17 ДОСТИЖЕНИЯ ПОЛЬЗОВАТЕЛЕЙ
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_achievements (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX user_achievements_user_id_earned_at_idx ON public.user_achievements (user_id, earned_at DESC);

COMMENT ON TABLE public.user_achievements IS 'Полученные пользователями достижения';

-- ============================================================================
-- ЧАСТЬ 5: ФУНКЦИИ
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Автоматическое обновление updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.2 Вычисление уровня по XP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_level(p_xp BIGINT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT GREATEST(1, FLOOR(SQRT(GREATEST(p_xp, 0) / 100.0))::INT + 1)
$$;

COMMENT ON FUNCTION public.compute_level IS 'Вычисляет уровень пользователя по количеству XP';

-- ----------------------------------------------------------------------------
-- 5.2.1 Получение email пользователя по ID (для авторизации по логину)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = user_id;
    
    RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.get_user_email_by_id IS 'Возвращает email пользователя по его ID для авторизации по логину';

-- ----------------------------------------------------------------------------
-- 5.3 Инициализация нового пользователя
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_first_name TEXT;
    v_last_name TEXT;
    v_username TEXT;
    v_user_meta JSONB;
BEGIN
    v_uid := auth.uid();
    
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Получаем метаданные пользователя из auth.users
    SELECT raw_user_meta_data INTO v_user_meta
    FROM auth.users
    WHERE id = v_uid;
    
    v_first_name := v_user_meta->>'first_name';
    v_last_name := v_user_meta->>'last_name';
    v_username := v_user_meta->>'username';
    
    -- Создаём профиль с данными из метаданных
    INSERT INTO public.profiles (id, first_name, last_name, username)
    VALUES (v_uid, v_first_name, v_last_name, v_username)
    ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
        last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
        username = COALESCE(profiles.username, EXCLUDED.username);
    
    -- Создаём настройки
    INSERT INTO public.user_settings (user_id)
    VALUES (v_uid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Создаём запись XP
    INSERT INTO public.user_xp (user_id)
    VALUES (v_uid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Создаём запись серий
    INSERT INTO public.user_streaks (user_id)
    VALUES (v_uid)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO authenticated;

-- ----------------------------------------------------------------------------
-- 5.4 Обработчик нового пользователя (триггер на auth.users)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_username TEXT;
BEGIN
    -- Извлекаем данные профиля из метаданных пользователя
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_username := NEW.raw_user_meta_data->>'username';
    
    -- Создаём профиль с данными из регистрации
    INSERT INTO public.profiles (id, first_name, last_name, username)
    VALUES (NEW.id, v_first_name, v_last_name, v_username)
    ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        username = COALESCE(EXCLUDED.username, profiles.username);
    
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_xp (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_streaks (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.5 Инициализация профиля пользователя (RPC для вызова после регистрации)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initialize_user_profile(
    p_user_id UUID,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_exists BOOLEAN;
BEGIN
    -- Проверяем, существует ли уже профиль
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
    
    IF v_profile_exists THEN
        -- Обновляем существующий профиль
        UPDATE public.profiles 
        SET first_name = COALESCE(p_first_name, first_name),
            last_name = COALESCE(p_last_name, last_name),
            username = COALESCE(p_username, username),
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        -- Создаём новый профиль (FK убран, поэтому вставка всегда работает)
        INSERT INTO public.profiles (id, first_name, last_name, username)
        VALUES (p_user_id, p_first_name, p_last_name, p_username);
    END IF;
    
    -- Создаём связанные записи
    INSERT INTO public.user_settings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_xp (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_streaks (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Логин уже занят', 'user_id', p_user_id);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'user_id', p_user_id);
END;
$$;

-- Разрешаем вызов для анонимных и аутентифицированных пользователей
GRANT EXECUTE ON FUNCTION public.initialize_user_profile(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5.6 Оценка решения задачи
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_lesson_submission(p_lesson_id UUID, p_piston_result JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_expected_stdout TEXT;
    v_stdout TEXT;
    v_stderr TEXT;
    v_code TEXT;
BEGIN
    -- Получаем ожидаемый вывод
    SELECT li.tests->>'expected_stdout'
    INTO v_expected_stdout
    FROM public.lesson_items li
    WHERE li.lesson_id = p_lesson_id
    ORDER BY li.order_index ASC
    LIMIT 1;
    
    IF v_expected_stdout IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Извлекаем результаты выполнения
    v_stdout := COALESCE(p_piston_result->>'stdout', p_piston_result->>'output', '');
    v_stderr := COALESCE(p_piston_result->>'stderr', '');
    v_code := COALESCE(p_piston_result->>'code', '0');
    
    -- Нормализация переносов строк
    v_stdout := REGEXP_REPLACE(v_stdout, E'\\r\\n', E'\\n', 'g');
    v_expected_stdout := REGEXP_REPLACE(v_expected_stdout, E'\\r\\n', E'\\n', 'g');
    
    -- Удаление trailing whitespace
    v_stdout := REGEXP_REPLACE(v_stdout, E'[\\s\\n]+$', '', 'g');
    v_expected_stdout := REGEXP_REPLACE(v_expected_stdout, E'[\\s\\n]+$', '', 'g');
    
    -- Проверка кода завершения
    IF v_code <> '0' THEN
        RETURN FALSE;
    END IF;
    
    -- Проверка stderr
    IF REGEXP_REPLACE(v_stderr, E'[\\s\\n]+$', '', 'g') <> '' THEN
        RETURN FALSE;
    END IF;
    
    -- Сравнение вывода
    RETURN v_stdout = v_expected_stdout;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.6 Завершение урока (с начислением XP и наград)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_now TIMESTAMPTZ;
    v_already_completed BOOLEAN;
    v_has_passed BOOLEAN;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Проверяем, не завершён ли уже урок
    SELECT (status = 'завершён')
    INTO v_already_completed
    FROM public.user_lesson_progress
    WHERE user_id = v_uid AND lesson_id = p_lesson_id;
    
    IF COALESCE(v_already_completed, FALSE) THEN
        RETURN; -- Урок уже завершён
    END IF;
    
    -- Проверяем наличие успешной отправки
    SELECT EXISTS (
        SELECT 1
        FROM public.code_submissions cs
        WHERE cs.user_id = v_uid
          AND cs.lesson_id = p_lesson_id
          AND cs.passed = TRUE
    ) INTO v_has_passed;
    
    IF NOT COALESCE(v_has_passed, FALSE) THEN
        RAISE EXCEPTION 'Lesson requirements not satisfied';
    END IF;
    
    v_now := NOW();
    
    -- Обновляем прогресс
    INSERT INTO public.user_lesson_progress (user_id, lesson_id, status, started_at, completed_at, last_attempt_at, updated_at)
    VALUES (v_uid, p_lesson_id, 'завершён', v_now, v_now, v_now, v_now)
    ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'завершён',
        completed_at = v_now,
        last_attempt_at = v_now,
        updated_at = v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_lesson(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5.7 Завершение лекции
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_lecture(p_lecture_id UUID, p_last_section_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_now TIMESTAMPTZ;
    v_already_completed BOOLEAN;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Проверяем, не завершена ли лекция
    SELECT completed
    INTO v_already_completed
    FROM public.user_lecture_progress
    WHERE user_id = v_uid AND lecture_id = p_lecture_id;
    
    IF COALESCE(v_already_completed, FALSE) THEN
        RETURN; -- Лекция уже завершена
    END IF;
    
    v_now := NOW();
    
    INSERT INTO public.user_lecture_progress (user_id, lecture_id, last_section_id, completed, updated_at)
    VALUES (v_uid, p_lecture_id, p_last_section_id, TRUE, v_now)
    ON CONFLICT (user_id, lecture_id) DO UPDATE
    SET last_section_id = COALESCE(EXCLUDED.last_section_id, user_lecture_progress.last_section_id),
        completed = TRUE,
        updated_at = v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_lecture(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5.8 Выдача достижения
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_achievement(p_user_id UUID, p_slug TEXT, p_metadata JSONB DEFAULT '{}'::JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_achievement_id UUID;
BEGIN
    SELECT id INTO v_achievement_id
    FROM public.achievements
    WHERE slug = p_slug AND published = TRUE;
    
    IF v_achievement_id IS NULL THEN
        RETURN;
    END IF;
    
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, v_achievement_id, COALESCE(p_metadata, '{}'::JSONB))
    ON CONFLICT DO NOTHING;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.9 Применение XP из транзакции
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_xp_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_xp BIGINT;
    v_new_level INTEGER;
BEGIN
    UPDATE public.user_xp
    SET xp = xp + NEW.amount,
        updated_at = NOW()
    WHERE user_id = NEW.user_id
    RETURNING xp INTO v_new_xp;
    
    IF v_new_xp IS NULL THEN
        INSERT INTO public.user_xp (user_id, xp, level)
        VALUES (NEW.user_id, GREATEST(0, NEW.amount), public.compute_level(GREATEST(0, NEW.amount)))
        ON CONFLICT (user_id) DO UPDATE SET xp = user_xp.xp + EXCLUDED.xp;
        
        SELECT xp INTO v_new_xp FROM public.user_xp WHERE user_id = NEW.user_id;
    END IF;
    
    v_new_level := public.compute_level(v_new_xp);
    
    UPDATE public.user_xp
    SET level = v_new_level,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.10 Обновление серии дней подряд (урок или лекция за день)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_streak_for_activity(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE;
    v_prev_date DATE;
    v_current INTEGER;
    v_best INTEGER;
BEGIN
    -- День по UTC для единообразия
    v_today := (NOW() AT TIME ZONE 'utc')::DATE;
    
    SELECT last_activity_date, current_streak, best_streak
    INTO v_prev_date, v_current, v_best
    FROM public.user_streaks
    WHERE user_id = p_user_id;
    
    IF v_prev_date IS NULL THEN
        -- Первая активность
        v_current := 1;
    ELSIF v_prev_date = v_today THEN
        -- Уже была активность сегодня — серию не увеличиваем
        v_current := COALESCE(v_current, 0);
    ELSIF v_prev_date = (v_today - 1) THEN
        -- Вчера была активность — продолжаем серию
        v_current := COALESCE(v_current, 0) + 1;
    ELSE
        -- Пропущен день и более — серия сбрасывается
        v_current := 1;
    END IF;
    
    v_best := GREATEST(COALESCE(v_best, 0), v_current);
    
    -- Upsert: создаём запись, если её нет
    INSERT INTO public.user_streaks (user_id, current_streak, best_streak, last_activity_date, updated_at)
    VALUES (p_user_id, v_current, v_best, v_today, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        best_streak = EXCLUDED.best_streak,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = EXCLUDED.updated_at;
    
    RETURN v_current;
END;
$$;

COMMENT ON FUNCTION public.update_streak_for_activity(UUID) IS 'Учитывает активность за текущий день (урок/лекция), обновляет current_streak и best_streak. Возвращает текущую серию.';

-- ----------------------------------------------------------------------------
-- 5.11 Награды за завершение урока
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_lesson_completed_awards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current INTEGER;
    v_lang public.programming_language;
    v_total_lang_lessons INTEGER;
    v_completed_lang_lessons INTEGER;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') 
       AND NEW.status = 'завершён' 
       AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        
        -- Начисляем XP
        INSERT INTO public.xp_transactions (user_id, lesson_id, amount, reason, metadata)
        VALUES (NEW.user_id, NEW.lesson_id, 100, 'lesson_completed', 
                JSONB_BUILD_OBJECT('lesson_id', NEW.lesson_id));
        
        -- Обновляем серию (урок или лекция за день считаются одной активностью)
        v_current := public.update_streak_for_activity(NEW.user_id);
        
        -- Выдаём достижение за первый урок
        PERFORM public.award_achievement(NEW.user_id, 'first_lesson', 
                JSONB_BUILD_OBJECT('lesson_id', NEW.lesson_id));
        
        -- Достижения за серии
        IF v_current >= 3 THEN
            PERFORM public.award_achievement(NEW.user_id, 'streak_3');
        END IF;
        IF v_current >= 7 THEN
            PERFORM public.award_achievement(NEW.user_id, 'streak_7');
        END IF;
        IF v_current >= 30 THEN
            PERFORM public.award_achievement(NEW.user_id, 'streak_30');
        END IF;
        
        -- Проверка мастерства языка
        SELECT language INTO v_lang FROM public.lessons WHERE id = NEW.lesson_id;
        
        IF v_lang IS NOT NULL THEN
            SELECT COUNT(*) INTO v_total_lang_lessons
            FROM public.lessons
            WHERE language = v_lang AND published = TRUE;
            
            SELECT COUNT(*) INTO v_completed_lang_lessons
            FROM public.user_lesson_progress ulp
            JOIN public.lessons l ON l.id = ulp.lesson_id
            WHERE ulp.user_id = NEW.user_id 
              AND ulp.status = 'завершён' 
              AND l.language = v_lang 
              AND l.published = TRUE;
            
            IF v_total_lang_lessons > 0 AND v_completed_lang_lessons >= v_total_lang_lessons THEN
                PERFORM public.award_achievement(NEW.user_id, 'language_mastery_' || v_lang::TEXT);
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.12 Награды за завершение лекции
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_lecture_completed_awards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current INTEGER;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') 
       AND NEW.completed = TRUE 
       AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
        
        -- Начисляем XP
        INSERT INTO public.xp_transactions (user_id, lecture_id, amount, reason, metadata)
        VALUES (NEW.user_id, NEW.lecture_id, 25, 'lecture_completed', 
                JSONB_BUILD_OBJECT('lecture_id', NEW.lecture_id));
        
        -- Учитываем день в серии (если сегодня ещё не было активности)
        v_current := public.update_streak_for_activity(NEW.user_id);
        
        -- Выдаём достижение за первую лекцию
        PERFORM public.award_achievement(NEW.user_id, 'first_lecture', 
                JSONB_BUILD_OBJECT('lecture_id', NEW.lecture_id));
        
        -- Достижения за серии (как и за уроки)
        IF v_current >= 3 THEN
            PERFORM public.award_achievement(NEW.user_id, 'streak_3');
        END IF;
        IF v_current >= 7 THEN
            PERFORM public.award_achievement(NEW.user_id, 'streak_7');
        END IF;
        IF v_current >= 30 THEN
            PERFORM public.award_achievement(NEW.user_id, 'streak_30');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.13 Защита от отмены завершения урока
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_uncomplete_lesson_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'завершён' AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Lesson progress cannot be reverted once completed';
    END IF;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5.14 Защита от отмены завершения лекции
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_uncomplete_lecture_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.completed = TRUE AND NEW.completed IS DISTINCT FROM OLD.completed THEN
        RAISE EXCEPTION 'Lecture progress cannot be reverted once completed';
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- ЧАСТЬ 6: ТРИГГЕРЫ
-- ============================================================================

-- Автообновление updated_at
CREATE TRIGGER profiles_set_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER lessons_set_updated_at 
    BEFORE UPDATE ON public.lessons 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER lectures_set_updated_at 
    BEFORE UPDATE ON public.lectures 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_settings_set_updated_at 
    BEFORE UPDATE ON public.user_settings 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_xp_set_updated_at 
    BEFORE UPDATE ON public.user_xp 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_lesson_progress_set_updated_at 
    BEFORE UPDATE ON public.user_lesson_progress 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_lesson_item_progress_set_updated_at 
    BEFORE UPDATE ON public.user_lesson_item_progress 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_lecture_progress_set_updated_at 
    BEFORE UPDATE ON public.user_lecture_progress 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_streaks_set_updated_at 
    BEFORE UPDATE ON public.user_streaks 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Триггер на auth.users для создания связанных записей
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Применение XP транзакций
CREATE TRIGGER xp_transactions_apply
    AFTER INSERT ON public.xp_transactions
    FOR EACH ROW EXECUTE FUNCTION public.add_xp_from_transaction();

-- Награды за завершение уроков
CREATE TRIGGER user_lesson_progress_completed_awards
    AFTER INSERT OR UPDATE ON public.user_lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.on_lesson_completed_awards();

-- Награды за завершение лекций
CREATE TRIGGER user_lecture_progress_completed_awards
    AFTER INSERT OR UPDATE ON public.user_lecture_progress
    FOR EACH ROW EXECUTE FUNCTION public.on_lecture_completed_awards();

-- Защита от отмены завершения
CREATE TRIGGER user_lesson_progress_prevent_uncomplete
    BEFORE UPDATE ON public.user_lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.prevent_uncomplete_lesson_progress();

CREATE TRIGGER user_lecture_progress_prevent_uncomplete
    BEFORE UPDATE ON public.user_lecture_progress
    FOR EACH ROW EXECUTE FUNCTION public.prevent_uncomplete_lecture_progress();

-- ============================================================================
-- ЧАСТЬ 7: ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_user_language_stats AS
WITH lessons_completed AS (
    SELECT
        ulp.user_id,
        l.language,
        COUNT(*) FILTER (WHERE ulp.status = 'завершён')::INT AS lessons_completed
    FROM public.user_lesson_progress ulp
    JOIN public.lessons l ON l.id = ulp.lesson_id
    GROUP BY ulp.user_id, l.language
),
submissions_count AS (
    SELECT
        cs.user_id,
        cs.language,
        COUNT(*)::INT AS submissions_count
    FROM public.code_submissions cs
    GROUP BY cs.user_id, cs.language
),
xp_by_lang AS (
    SELECT
        xt.user_id,
        l.language,
        SUM(xt.amount)::BIGINT AS total_xp
    FROM public.xp_transactions xt
    JOIN public.lessons l ON l.id = xt.lesson_id
    GROUP BY xt.user_id, l.language
    
    UNION ALL
    
    SELECT
        xt.user_id,
        lec.language,
        SUM(xt.amount)::BIGINT AS total_xp
    FROM public.xp_transactions xt
    JOIN public.lectures lec ON lec.id = xt.lecture_id
    GROUP BY xt.user_id, lec.language
),
xp_agg AS (
    SELECT user_id, language, SUM(total_xp)::BIGINT AS total_xp
    FROM xp_by_lang
    GROUP BY user_id, language
),
keys AS (
    SELECT user_id, language FROM lessons_completed
    UNION
    SELECT user_id, language FROM submissions_count
    UNION
    SELECT user_id, language FROM xp_agg
)
SELECT
    k.user_id,
    k.language,
    COALESCE(lc.lessons_completed, 0) AS lessons_completed,
    COALESCE(sc.submissions_count, 0) AS submissions_count,
    COALESCE(xa.total_xp, 0) AS total_xp
FROM keys k
LEFT JOIN lessons_completed lc ON lc.user_id = k.user_id AND lc.language = k.language
LEFT JOIN submissions_count sc ON sc.user_id = k.user_id AND sc.language = k.language
LEFT JOIN xp_agg xa ON xa.user_id = k.user_id AND xa.language = k.language;

COMMENT ON VIEW public.v_user_language_stats IS 'Статистика пользователей по языкам программирования';

-- ============================================================================
-- ЧАСТЬ 8: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Включаем RLS на всех таблицах
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_item_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hint_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
-- Все аутентифицированные пользователи могут видеть профили (для лидерборда)
-- Все могут читать профили (нужно для логина по username и лидерборда)
CREATE POLICY profiles_select_all 
    ON public.profiles FOR SELECT 
    TO anon, authenticated 
    USING (TRUE);

-- Пользователь может создать свой профиль
CREATE POLICY profiles_insert_own 
    ON public.profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id);

-- Пользователь может редактировать свой профиль
CREATE POLICY profiles_update_own 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- Администратор может редактировать любой профиль
CREATE POLICY profiles_update_admin 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'администратор'
    ));

-- ----------------------------------------------------------------------------
-- USER_SETTINGS
-- ----------------------------------------------------------------------------
CREATE POLICY user_settings_select_own 
    ON public.user_settings FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert_own 
    ON public.user_settings FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_settings_update_own 
    ON public.user_settings FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- USER_XP
-- ----------------------------------------------------------------------------
-- Все могут видеть XP (для лидерборда)
CREATE POLICY user_xp_select_all 
    ON public.user_xp FOR SELECT 
    TO authenticated 
    USING (TRUE);

CREATE POLICY user_xp_insert_own 
    ON public.user_xp FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- USER_STREAKS
-- ----------------------------------------------------------------------------
CREATE POLICY user_streaks_select_own 
    ON public.user_streaks FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY user_streaks_insert_own 
    ON public.user_streaks FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- XP_TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE POLICY xp_transactions_select_own 
    ON public.xp_transactions FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- LESSONS
-- ----------------------------------------------------------------------------
-- Опубликованные уроки видны всем
CREATE POLICY lessons_select_published 
    ON public.lessons FOR SELECT 
    USING (published = TRUE);

-- Менторы и админы могут всё
CREATE POLICY lessons_mentor_all 
    ON public.lessons FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    )) 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- LESSON_ITEMS
-- ----------------------------------------------------------------------------
CREATE POLICY lesson_items_select 
    ON public.lesson_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.lessons l 
        WHERE l.id = lesson_id AND l.published = TRUE
    ));

CREATE POLICY lesson_items_mentor_all 
    ON public.lesson_items FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    )) 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- LESSON_HINTS
-- ----------------------------------------------------------------------------
CREATE POLICY lesson_hints_select 
    ON public.lesson_hints FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.lesson_items li
        JOIN public.lessons l ON l.id = li.lesson_id
        WHERE li.id = item_id AND l.published = TRUE
    ));

CREATE POLICY lesson_hints_mentor_all 
    ON public.lesson_hints FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    )) 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- LECTURES
-- ----------------------------------------------------------------------------
CREATE POLICY lectures_select_published 
    ON public.lectures FOR SELECT 
    USING (published = TRUE);

CREATE POLICY lectures_mentor_all 
    ON public.lectures FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    )) 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- LECTURE_SECTIONS
-- ----------------------------------------------------------------------------
CREATE POLICY lecture_sections_select 
    ON public.lecture_sections FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.lectures lec 
        WHERE lec.id = lecture_id AND lec.published = TRUE
    ));

CREATE POLICY lecture_sections_mentor_all 
    ON public.lecture_sections FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    )) 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- USER_LESSON_PROGRESS (ИСПРАВЛЕННЫЕ ПОЛИТИКИ)
-- ----------------------------------------------------------------------------
-- Пользователь видит свой прогресс
CREATE POLICY user_lesson_progress_select_own 
    ON public.user_lesson_progress FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Пользователь может создавать свой прогресс
-- Разрешаем 'завершён' только если есть успешная отправка кода для этого урока
CREATE POLICY user_lesson_progress_insert_own 
    ON public.user_lesson_progress FOR INSERT 
    TO authenticated 
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            -- Можно создавать со статусом 'не_начат' или 'в_процессе'
            status IN ('не_начат', 'в_процессе')
            -- ИЛИ 'завершён' если есть успешная отправка
            OR (
                status = 'завершён' 
                AND EXISTS (
                    SELECT 1 FROM public.code_submissions cs
                    WHERE cs.user_id = auth.uid()
                      AND cs.lesson_id = user_lesson_progress.lesson_id
                      AND cs.passed = TRUE
                )
            )
        )
    );

-- Пользователь может обновлять свой прогресс
-- Разрешаем 'завершён' только если есть успешная отправка кода
CREATE POLICY user_lesson_progress_update_own 
    ON public.user_lesson_progress FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            -- Можно обновлять на 'не_начат' или 'в_процессе'
            status IN ('не_начат', 'в_процессе')
            -- ИЛИ 'завершён' если есть успешная отправка
            OR (
                status = 'завершён' 
                AND EXISTS (
                    SELECT 1 FROM public.code_submissions cs
                    WHERE cs.user_id = auth.uid()
                      AND cs.lesson_id = user_lesson_progress.lesson_id
                      AND cs.passed = TRUE
                )
            )
        )
    );

-- ----------------------------------------------------------------------------
-- USER_LESSON_ITEM_PROGRESS
-- ----------------------------------------------------------------------------
CREATE POLICY user_lesson_item_progress_select_own 
    ON public.user_lesson_item_progress FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY user_lesson_item_progress_insert_own 
    ON public.user_lesson_item_progress FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_lesson_item_progress_update_own 
    ON public.user_lesson_item_progress FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- USER_LECTURE_PROGRESS
-- ----------------------------------------------------------------------------
CREATE POLICY user_lecture_progress_select_own 
    ON public.user_lecture_progress FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Разрешаем вставку только с completed = false
CREATE POLICY user_lecture_progress_insert_own 
    ON public.user_lecture_progress FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id AND completed = FALSE);

-- Разрешаем обновление (но completed устанавливается через функцию)
CREATE POLICY user_lecture_progress_update_own 
    ON public.user_lecture_progress FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id AND completed = FALSE);

-- ----------------------------------------------------------------------------
-- CODE_SUBMISSIONS (ИСПРАВЛЕННЫЕ ПОЛИТИКИ)
-- ----------------------------------------------------------------------------
CREATE POLICY code_submissions_select_own 
    ON public.code_submissions FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Разрешаем пользователям отправлять свой код
CREATE POLICY code_submissions_insert_own 
    ON public.code_submissions FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Менторы и админы могут видеть все отправки
CREATE POLICY code_submissions_select_mentor 
    ON public.code_submissions FOR SELECT 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- USER_HINT_USAGE
-- ----------------------------------------------------------------------------
CREATE POLICY user_hint_usage_select_own 
    ON public.user_hint_usage FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY user_hint_usage_insert_own 
    ON public.user_hint_usage FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- ACHIEVEMENTS
-- ----------------------------------------------------------------------------
CREATE POLICY achievements_select 
    ON public.achievements FOR SELECT 
    USING (published = TRUE);

-- Менторы и админы управляют достижениями
CREATE POLICY achievements_mentor_all 
    ON public.achievements FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    )) 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ментор', 'администратор')
    ));

-- ----------------------------------------------------------------------------
-- USER_ACHIEVEMENTS
-- ----------------------------------------------------------------------------
CREATE POLICY user_achievements_select_own 
    ON public.user_achievements FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- ============================================================================
-- ЧАСТЬ 9: ПРАВА ДОСТУПА
-- ============================================================================

-- Права на схему
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Права на таблицы
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Права на последовательности
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Права по умолчанию для новых объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- ============================================================================
-- ЧАСТЬ 10: ХРАНИЛИЩЕ (STORAGE)
-- ============================================================================

-- Создаём bucket для аватаров (если не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Политики для bucket avatars
CREATE POLICY avatars_public_read 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');

CREATE POLICY avatars_upload_own 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY avatars_update_own 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'avatars' AND auth.uid() = owner) 
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY avatars_delete_own 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- ============================================================================
-- ЧАСТЬ 11: НАЧАЛЬНЫЕ ДАННЫЕ - ДОСТИЖЕНИЯ
-- ============================================================================

INSERT INTO public.achievements (slug, title, description, rarity, points, criteria_type, criteria, published) VALUES
    ('first_lesson', 'Первые шаги', 'Завершите первый урок', 'common', 10, 'lesson_completed_count', '{"min": 1}'::JSONB, TRUE),
    ('first_lecture', 'Первая лекция', 'Завершите первую лекцию', 'common', 5, 'lecture_completed_count', '{"min": 1}'::JSONB, TRUE),
    ('streak_3', 'Серия 3 дня', 'Учитесь 3 дня подряд', 'common', 10, 'streak', '{"min_days": 3}'::JSONB, TRUE),
    ('streak_7', 'Серия 7 дней', 'Учитесь 7 дней подряд', 'rare', 25, 'streak', '{"min_days": 7}'::JSONB, TRUE),
    ('streak_30', 'Серия 30 дней', 'Учитесь 30 дней подряд', 'legendary', 100, 'streak', '{"min_days": 30}'::JSONB, TRUE),
    ('language_mastery_python', 'Мастер Python', 'Завершите все уроки по Python', 'epic', 75, 'language_mastery', '{"language": "python"}'::JSONB, TRUE),
    ('language_mastery_javascript', 'Мастер JavaScript', 'Завершите все уроки по JavaScript', 'epic', 75, 'language_mastery', '{"language": "javascript"}'::JSONB, TRUE),
    ('language_mastery_cpp', 'Мастер C++', 'Завершите все уроки по C++', 'epic', 75, 'language_mastery', '{"language": "cpp"}'::JSONB, TRUE),
    ('language_mastery_c', 'Мастер C', 'Завершите все уроки по C', 'epic', 75, 'language_mastery', '{"language": "c"}'::JSONB, TRUE),
    ('language_mastery_go', 'Мастер Go', 'Завершите все уроки по Go', 'epic', 75, 'language_mastery', '{"language": "go"}'::JSONB, TRUE),
    ('submissions_10', 'Настойчивость', 'Отправьте 10 решений', 'common', 15, 'submissions_count', '{"min": 10}'::JSONB, TRUE),
    ('submissions_50', 'Упорство', 'Отправьте 50 решений', 'rare', 30, 'submissions_count', '{"min": 50}'::JSONB, TRUE),
    ('submissions_100', 'Неутомимый', 'Отправьте 100 решений', 'epic', 50, 'submissions_count', '{"min": 100}'::JSONB, TRUE),
    ('level_5', 'Начинающий', 'Достигните 5 уровня', 'common', 20, 'level', '{"min": 5}'::JSONB, TRUE),
    ('level_10', 'Продвинутый', 'Достигните 10 уровня', 'rare', 40, 'level', '{"min": 10}'::JSONB, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    rarity = EXCLUDED.rarity,
    points = EXCLUDED.points,
    criteria_type = EXCLUDED.criteria_type,
    criteria = EXCLUDED.criteria,
    published = EXCLUDED.published;

-- ============================================================================
-- ЧАСТЬ 12: ТЕСТОВЫЕ ДАННЫЕ - УРОКИ
-- ============================================================================

-- Python уроки
INSERT INTO public.lessons (slug, title, description, type, difficulty, language, order_index, estimated_minutes, published) VALUES
    ('py-hello', 'Python: Hello World', 'Первый запуск кода и базовый вывод в консоль', 'practice', 'лёгкий', 'python', 1, 10, TRUE),
    ('py-strings', 'Python: Строки', 'Работа со строками: конкатенация, форматирование, методы', 'practice', 'лёгкий', 'python', 2, 15, TRUE),
    ('py-numbers', 'Python: Числа и математика', 'Арифметические операции и работа с числами', 'practice', 'лёгкий', 'python', 3, 15, TRUE),
    ('py-conditions', 'Python: Условия', 'Условные операторы if/elif/else', 'practice', 'средний', 'python', 4, 20, TRUE),
    ('py-loops', 'Python: Циклы', 'Циклы for и while', 'practice', 'средний', 'python', 5, 25, TRUE),
    ('py-lists', 'Python: Списки', 'Работа со списками и методами списков', 'practice', 'средний', 'python', 6, 25, TRUE),
    ('py-functions', 'Python: Функции', 'Создание и использование функций', 'practice', 'сложный', 'python', 7, 30, TRUE),
    ('py-dicts', 'Python: Словари', 'Работа со словарями', 'practice', 'сложный', 'python', 8, 30, TRUE),
    ('py-files', 'Python: Файлы', 'Чтение и запись файлов', 'practice', 'сложный', 'python', 9, 35, TRUE),

    -- JavaScript уроки
    ('js-hello', 'JavaScript: Hello World', 'Первый вывод в консоль', 'practice', 'лёгкий', 'javascript', 10, 10, TRUE),
    ('js-variables', 'JavaScript: Переменные', 'let, const и var - различия и использование', 'practice', 'лёгкий', 'javascript', 11, 15, TRUE),
    ('js-types', 'JavaScript: Типы данных', 'Примитивные типы и объекты', 'practice', 'лёгкий', 'javascript', 12, 15, TRUE),
    ('js-conditions', 'JavaScript: Условия', 'if/else и тернарный оператор', 'practice', 'средний', 'javascript', 13, 20, TRUE),
    ('js-loops', 'JavaScript: Циклы', 'for, while и методы массивов', 'practice', 'средний', 'javascript', 14, 25, TRUE),
    ('js-arrays', 'JavaScript: Массивы', 'Методы массивов: map, filter, reduce', 'practice', 'средний', 'javascript', 15, 25, TRUE),
    ('js-functions', 'JavaScript: Функции', 'Функции и стрелочные функции', 'practice', 'сложный', 'javascript', 16, 30, TRUE),
    ('js-objects', 'JavaScript: Объекты', 'Работа с объектами', 'practice', 'сложный', 'javascript', 17, 30, TRUE),
    ('js-async', 'JavaScript: Асинхронность', 'Promise, async/await', 'practice', 'сложный', 'javascript', 18, 40, TRUE),

    -- C++ уроки
    ('cpp-hello', 'C++: Hello World', 'Структура программы и первый вывод', 'practice', 'лёгкий', 'cpp', 19, 15, TRUE),
    ('cpp-variables', 'C++: Переменные', 'Типы данных и объявление переменных', 'practice', 'лёгкий', 'cpp', 20, 15, TRUE),
    ('cpp-input', 'C++: Ввод/Вывод', 'cin и cout', 'practice', 'лёгкий', 'cpp', 21, 15, TRUE),
    ('cpp-conditions', 'C++: Условия', 'if/else и switch', 'practice', 'средний', 'cpp', 22, 20, TRUE),
    ('cpp-loops', 'C++: Циклы', 'for, while, do-while', 'practice', 'средний', 'cpp', 23, 25, TRUE),
    ('cpp-arrays', 'C++: Массивы', 'Статические и динамические массивы', 'practice', 'средний', 'cpp', 24, 25, TRUE),
    ('cpp-functions', 'C++: Функции', 'Функции и перегрузка', 'practice', 'сложный', 'cpp', 25, 30, TRUE),
    ('cpp-pointers', 'C++: Указатели', 'Работа с указателями и ссылками', 'practice', 'сложный', 'cpp', 26, 40, TRUE),
    ('cpp-classes', 'C++: Классы', 'ООП в C++', 'practice', 'сложный', 'cpp', 27, 45, TRUE),

    -- C уроки
    ('c-hello', 'C: Hello World', 'Первая программа на C', 'practice', 'лёгкий', 'c', 28, 15, TRUE),
    ('c-variables', 'C: Переменные', 'Типы данных в C', 'practice', 'лёгкий', 'c', 29, 15, TRUE),
    ('c-printf', 'C: Форматированный вывод', 'printf и спецификаторы формата', 'practice', 'лёгкий', 'c', 30, 15, TRUE),
    ('c-conditions', 'C: Условия', 'Условные операторы', 'practice', 'средний', 'c', 31, 20, TRUE),
    ('c-loops', 'C: Циклы', 'Циклы в C', 'practice', 'средний', 'c', 32, 25, TRUE),
    ('c-arrays', 'C: Массивы', 'Работа с массивами', 'practice', 'средний', 'c', 33, 25, TRUE),
    ('c-functions', 'C: Функции', 'Создание функций', 'practice', 'сложный', 'c', 34, 30, TRUE),
    ('c-pointers', 'C: Указатели', 'Указатели и адреса', 'practice', 'сложный', 'c', 35, 40, TRUE),
    ('c-structs', 'C: Структуры', 'Пользовательские типы данных', 'practice', 'сложный', 'c', 36, 35, TRUE),

    -- Go уроки
    ('go-hello', 'Go: Hello World', 'Первая программа на Go', 'practice', 'лёгкий', 'go', 37, 12, TRUE),
    ('go-variables', 'Go: Переменные', 'Объявление переменных и типы', 'practice', 'лёгкий', 'go', 38, 15, TRUE),
    ('go-fmt', 'Go: Форматирование', 'Пакет fmt', 'practice', 'лёгкий', 'go', 39, 15, TRUE),
    ('go-conditions', 'Go: Условия', 'if/else и switch', 'practice', 'средний', 'go', 40, 20, TRUE),
    ('go-loops', 'Go: Циклы', 'for - единственный цикл в Go', 'practice', 'средний', 'go', 41, 20, TRUE),
    ('go-slices', 'Go: Слайсы', 'Работа со слайсами', 'practice', 'средний', 'go', 42, 25, TRUE),
    ('go-functions', 'Go: Функции', 'Функции и множественные возвращаемые значения', 'practice', 'сложный', 'go', 43, 30, TRUE),
    ('go-structs', 'Go: Структуры', 'Структуры и методы', 'practice', 'сложный', 'go', 44, 35, TRUE),
    ('go-goroutines', 'Go: Горутины', 'Параллельное программирование', 'practice', 'сложный', 'go', 45, 40, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    difficulty = EXCLUDED.difficulty,
    language = EXCLUDED.language,
    order_index = EXCLUDED.order_index,
    estimated_minutes = EXCLUDED.estimated_minutes,
    published = EXCLUDED.published;

-- ============================================================================
-- ЧАСТЬ 13: ТЕСТОВЫЕ ДАННЫЕ - ЭЛЕМЕНТЫ УРОКОВ
-- ============================================================================

-- Удаляем старые данные
DELETE FROM public.lesson_hints WHERE item_id IN (
    SELECT li.id FROM public.lesson_items li
    JOIN public.lessons l ON l.id = li.lesson_id
);
DELETE FROM public.lesson_items;

-- Python Hello World
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Hello World в Python

Ваша первая программа! Выведите строку `Hello, world!` в консоль.

## Требования
- Выведите **ровно** строку `Hello, world!`
- Используйте функцию `print()`
- Без лишних пробелов и символов

## Формат вывода
```
Hello, world!
```',
E'# Напишите ваш код здесь\n',
E'print("Hello, world!")\n',
'{"expected_stdout": "Hello, world!"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-hello';

-- Python Strings
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Работа со строками

Создайте строку с текстом `Imperion` и выведите её.

## Требования
- Сохраните текст в переменную
- Выведите значение переменной

## Формат вывода
```
Imperion
```',
E'# Создайте переменную и выведите её\nname = ""\nprint(name)\n',
E'name = "Imperion"\nprint(name)\n',
'{"expected_stdout": "Imperion"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-strings';

-- Python Numbers
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Числа и математика

Вычислите сумму чисел от 1 до 5 и выведите результат.

## Формат вывода
```
15
```',
E'# Вычислите сумму\nresult = 0\nprint(result)\n',
E'result = 1 + 2 + 3 + 4 + 5\nprint(result)\n',
'{"expected_stdout": "15"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-numbers';

-- Python Conditions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Условные операторы

Проверьте, является ли число 42 чётным. Выведите `even` если да, `odd` если нет.

## Формат вывода
```
even
```',
E'number = 42\n# Проверьте чётность\n',
E'number = 42\nif number % 2 == 0:\n    print("even")\nelse:\n    print("odd")\n',
'{"expected_stdout": "even"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-conditions';

-- Python Loops
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Циклы

Выведите числа от 0 до 4, каждое на новой строке.

## Формат вывода
```
0
1
2
3
4
```',
E'# Используйте цикл for\n',
E'for i in range(5):\n    print(i)\n',
'{"expected_stdout": "0\n1\n2\n3\n4"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-loops';

-- Python Lists
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Списки

Создайте список `[1, 2, 3]` и выведите его сумму.

## Формат вывода
```
6
```',
E'# Создайте список и найдите сумму\nnumbers = []\n',
E'numbers = [1, 2, 3]\nprint(sum(numbers))\n',
'{"expected_stdout": "6"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-lists';

-- Python Functions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Функции

Создайте функцию `greet(name)`, которая возвращает строку `Hello, {name}!`
Вызовите её с аргументом `World` и выведите результат.

## Формат вывода
```
Hello, World!
```',
E'def greet(name):\n    # Верните приветствие\n    pass\n\nprint(greet("World"))\n',
E'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n',
'{"expected_stdout": "Hello, World!"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-functions';

-- Python Dicts
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Словари

Создайте словарь с ключом `name` и значением `Python`. Выведите значение.

## Формат вывода
```
Python
```',
E'# Создайте словарь\ndata = {}\n',
E'data = {"name": "Python"}\nprint(data["name"])\n',
'{"expected_stdout": "Python"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-dicts';

-- Python Files
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Работа с файлами (теория)

В этом уроке мы изучаем работу с файлами. Для тестирования выведите `File IO`.

## Формат вывода
```
File IO
```',
E'# Выведите File IO\n',
E'print("File IO")\n',
'{"expected_stdout": "File IO"}'::JSONB
FROM public.lessons l WHERE l.slug = 'py-files';

-- JavaScript Hello World
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Hello World в JavaScript

Выведите строку `Hello, world!` в консоль.

## Требования
- Используйте `console.log()`

## Формат вывода
```
Hello, world!
```',
E'// Напишите ваш код\n',
E'console.log("Hello, world!");\n',
'{"expected_stdout": "Hello, world!"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-hello';

-- JavaScript Variables
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Переменные в JavaScript

Создайте переменную `message` со значением `JavaScript` и выведите её.

## Формат вывода
```
JavaScript
```',
E'// Объявите переменную\n',
E'const message = "JavaScript";\nconsole.log(message);\n',
'{"expected_stdout": "JavaScript"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-variables';

-- JavaScript Types
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Типы данных

Выведите тип числа 42 с помощью `typeof`.

## Формат вывода
```
number
```',
E'// Используйте typeof\n',
E'console.log(typeof 42);\n',
'{"expected_stdout": "number"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-types';

-- JavaScript Conditions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Условия в JavaScript

Проверьте, больше ли 10 чем 5. Выведите `true` или `false`.

## Формат вывода
```
true
```',
E'// Сравните числа\n',
E'console.log(10 > 5);\n',
'{"expected_stdout": "true"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-conditions';

-- JavaScript Loops
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Циклы в JavaScript

Выведите числа от 0 до 4, каждое на новой строке.

## Формат вывода
```
0
1
2
3
4
```',
E'// Используйте цикл for\n',
E'for (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n',
'{"expected_stdout": "0\n1\n2\n3\n4"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-loops';

-- JavaScript Arrays
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Массивы в JavaScript

Создайте массив `[1, 2, 3]` и выведите его длину.

## Формат вывода
```
3
```',
E'// Создайте массив\n',
E'const arr = [1, 2, 3];\nconsole.log(arr.length);\n',
'{"expected_stdout": "3"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-arrays';

-- JavaScript Functions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Функции в JavaScript

Создайте функцию `add(a, b)`, возвращающую сумму. Выведите `add(2, 3)`.

## Формат вывода
```
5
```',
E'// Создайте функцию\n',
E'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));\n',
'{"expected_stdout": "5"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-functions';

-- JavaScript Objects
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Объекты в JavaScript

Создайте объект с свойством `lang: "JS"` и выведите его значение.

## Формат вывода
```
JS
```',
E'// Создайте объект\n',
E'const obj = { lang: "JS" };\nconsole.log(obj.lang);\n',
'{"expected_stdout": "JS"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-objects';

-- JavaScript Async
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Асинхронность (теория)

Для демонстрации выведите `async/await`.

## Формат вывода
```
async/await
```',
E'// Выведите async/await\n',
E'console.log("async/await");\n',
'{"expected_stdout": "async/await"}'::JSONB
FROM public.lessons l WHERE l.slug = 'js-async';

-- C++ Hello World
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Hello World в C++

Выведите строку `Hello, world!`.

## Формат вывода
```
Hello, world!
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  // Ваш код\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello, world!" << endl;\n  return 0;\n}\n',
'{"expected_stdout": "Hello, world!"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-hello';

-- C++ Variables
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Переменные в C++

Объявите переменную `int x = 42` и выведите её.

## Формат вывода
```
42
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  // Объявите переменную\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int x = 42;\n  cout << x << endl;\n  return 0;\n}\n',
'{"expected_stdout": "42"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-variables';

-- C++ Input
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Ввод и вывод в C++

Выведите строку `IO in C++`.

## Формат вывода
```
IO in C++
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  // Ваш код\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "IO in C++" << endl;\n  return 0;\n}\n',
'{"expected_stdout": "IO in C++"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-input';

-- C++ Conditions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Условия в C++

Проверьте, равно ли 5 пяти. Выведите `yes` если да.

## Формат вывода
```
yes
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int x = 5;\n  // Проверьте условие\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int x = 5;\n  if (x == 5) {\n    cout << "yes" << endl;\n  }\n  return 0;\n}\n',
'{"expected_stdout": "yes"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-conditions';

-- C++ Loops
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Циклы в C++

Выведите числа от 0 до 4.

## Формат вывода
```
0
1
2
3
4
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  // Используйте цикл for\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  for (int i = 0; i < 5; i++) {\n    cout << i << endl;\n  }\n  return 0;\n}\n',
'{"expected_stdout": "0\n1\n2\n3\n4"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-loops';

-- C++ Arrays
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Массивы в C++

Выведите элементы массива `{1, 2, 3}`, каждый на новой строке.

## Формат вывода
```
1
2
3
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int arr[] = {1, 2, 3};\n  // Выведите элементы\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int arr[] = {1, 2, 3};\n  for (int i = 0; i < 3; i++) {\n    cout << arr[i] << endl;\n  }\n  return 0;\n}\n',
'{"expected_stdout": "1\n2\n3"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-arrays';

-- C++ Functions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Функции в C++

Создайте функцию `int square(int x)` и выведите `square(4)`.

## Формат вывода
```
16
```',
E'#include <iostream>\nusing namespace std;\n\n// Создайте функцию square\n\nint main() {\n  cout << square(4) << endl;\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint square(int x) {\n  return x * x;\n}\n\nint main() {\n  cout << square(4) << endl;\n  return 0;\n}\n',
'{"expected_stdout": "16"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-functions';

-- C++ Pointers
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Указатели в C++

Создайте переменную `int x = 10`, указатель на неё и выведите значение через указатель.

## Формат вывода
```
10
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int x = 10;\n  // Создайте указатель и выведите значение\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  int x = 10;\n  int* ptr = &x;\n  cout << *ptr << endl;\n  return 0;\n}\n',
'{"expected_stdout": "10"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-pointers';

-- C++ Classes
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Классы в C++

Выведите строку `OOP in C++`.

## Формат вывода
```
OOP in C++
```',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  // Выведите строку\n  return 0;\n}\n',
E'#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "OOP in C++" << endl;\n  return 0;\n}\n',
'{"expected_stdout": "OOP in C++"}'::JSONB
FROM public.lessons l WHERE l.slug = 'cpp-classes';

-- C Hello World
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Hello World в C

Выведите строку `Hello, world!`.

## Формат вывода
```
Hello, world!
```',
E'#include <stdio.h>\n\nint main() {\n  // Ваш код\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  printf("Hello, world!\\n");\n  return 0;\n}\n',
'{"expected_stdout": "Hello, world!"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-hello';

-- C Variables
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Переменные в C

Объявите `int x = 100` и выведите.

## Формат вывода
```
100
```',
E'#include <stdio.h>\n\nint main() {\n  // Объявите переменную\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  int x = 100;\n  printf("%d\\n", x);\n  return 0;\n}\n',
'{"expected_stdout": "100"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-variables';

-- C printf
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# printf в C

Выведите `C language`.

## Формат вывода
```
C language
```',
E'#include <stdio.h>\n\nint main() {\n  // Используйте printf\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  printf("C language\\n");\n  return 0;\n}\n',
'{"expected_stdout": "C language"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-printf';

-- C Conditions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Условия в C

Проверьте, положительно ли число 7. Выведите `positive`.

## Формат вывода
```
positive
```',
E'#include <stdio.h>\n\nint main() {\n  int x = 7;\n  // Проверьте условие\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  int x = 7;\n  if (x > 0) {\n    printf("positive\\n");\n  }\n  return 0;\n}\n',
'{"expected_stdout": "positive"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-conditions';

-- C Loops
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Циклы в C

Выведите числа от 1 до 3.

## Формат вывода
```
1
2
3
```',
E'#include <stdio.h>\n\nint main() {\n  // Используйте цикл\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  for (int i = 1; i <= 3; i++) {\n    printf("%d\\n", i);\n  }\n  return 0;\n}\n',
'{"expected_stdout": "1\n2\n3"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-loops';

-- C Arrays
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Массивы в C

Выведите элементы `{10, 20, 30}`.

## Формат вывода
```
10
20
30
```',
E'#include <stdio.h>\n\nint main() {\n  int arr[] = {10, 20, 30};\n  // Выведите элементы\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  int arr[] = {10, 20, 30};\n  for (int i = 0; i < 3; i++) {\n    printf("%d\\n", arr[i]);\n  }\n  return 0;\n}\n',
'{"expected_stdout": "10\n20\n30"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-arrays';

-- C Functions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Функции в C

Создайте функцию `int double_it(int x)` и выведите `double_it(5)`.

## Формат вывода
```
10
```',
E'#include <stdio.h>\n\n// Создайте функцию\n\nint main() {\n  printf("%d\\n", double_it(5));\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint double_it(int x) {\n  return x * 2;\n}\n\nint main() {\n  printf("%d\\n", double_it(5));\n  return 0;\n}\n',
'{"expected_stdout": "10"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-functions';

-- C Pointers
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Указатели в C

Выведите `pointers`.

## Формат вывода
```
pointers
```',
E'#include <stdio.h>\n\nint main() {\n  // Ваш код\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  printf("pointers\\n");\n  return 0;\n}\n',
'{"expected_stdout": "pointers"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-pointers';

-- C Structs
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Структуры в C

Выведите `structs`.

## Формат вывода
```
structs
```',
E'#include <stdio.h>\n\nint main() {\n  // Ваш код\n  return 0;\n}\n',
E'#include <stdio.h>\n\nint main() {\n  printf("structs\\n");\n  return 0;\n}\n',
'{"expected_stdout": "structs"}'::JSONB
FROM public.lessons l WHERE l.slug = 'c-structs';

-- Go Hello World
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Hello World в Go

Выведите `Hello, world!`.

## Формат вывода
```
Hello, world!
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Ваш код\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, world!")\n}\n',
'{"expected_stdout": "Hello, world!"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-hello';

-- Go Variables
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Переменные в Go

Объявите переменную `message := "Go"` и выведите.

## Формат вывода
```
Go
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Объявите переменную\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  message := "Go"\n  fmt.Println(message)\n}\n',
'{"expected_stdout": "Go"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-variables';

-- Go fmt
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Форматирование в Go

Выведите `fmt package`.

## Формат вывода
```
fmt package
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Используйте fmt\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("fmt package")\n}\n',
'{"expected_stdout": "fmt package"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-fmt';

-- Go Conditions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Условия в Go

Если 10 > 5, выведите `greater`.

## Формат вывода
```
greater
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Проверьте условие\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  if 10 > 5 {\n    fmt.Println("greater")\n  }\n}\n',
'{"expected_stdout": "greater"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-conditions';

-- Go Loops
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Циклы в Go

Выведите числа от 0 до 2.

## Формат вывода
```
0
1
2
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Используйте for\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  for i := 0; i < 3; i++ {\n    fmt.Println(i)\n  }\n}\n',
'{"expected_stdout": "0\n1\n2"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-loops';

-- Go Slices
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Слайсы в Go

Создайте слайс `[]int{1, 2}` и выведите длину.

## Формат вывода
```
2
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Создайте слайс\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  s := []int{1, 2}\n  fmt.Println(len(s))\n}\n',
'{"expected_stdout": "2"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-slices';

-- Go Functions
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Функции в Go

Создайте функцию `greet(name string) string` и выведите `greet("Go")`.

## Формат вывода
```
Hello, Go
```',
E'package main\n\nimport "fmt"\n\n// Создайте функцию greet\n\nfunc main() {\n  fmt.Println(greet("Go"))\n}\n',
E'package main\n\nimport "fmt"\n\nfunc greet(name string) string {\n  return "Hello, " + name\n}\n\nfunc main() {\n  fmt.Println(greet("Go"))\n}\n',
'{"expected_stdout": "Hello, Go"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-functions';

-- Go Structs
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Структуры в Go

Выведите `Go structs`.

## Формат вывода
```
Go structs
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Ваш код\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Go structs")\n}\n',
'{"expected_stdout": "Go structs"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-structs';

-- Go Goroutines
INSERT INTO public.lesson_items (lesson_id, order_index, content_markdown, starter_code, solution_code, tests)
SELECT l.id, 1,
E'# Горутины в Go

Выведите `concurrency`.

## Формат вывода
```
concurrency
```',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  // Ваш код\n}\n',
E'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("concurrency")\n}\n',
'{"expected_stdout": "concurrency"}'::JSONB
FROM public.lessons l WHERE l.slug = 'go-goroutines';

-- ============================================================================
-- ЧАСТЬ 14: ТЕСТОВЫЕ ДАННЫЕ - ПОДСКАЗКИ К УРОКАМ
-- ============================================================================

INSERT INTO public.lesson_hints (item_id, order_index, hint_markdown, penalty_xp)
SELECT li.id, 1,
    CASE l.slug
        WHEN 'py-hello' THEN 'Используйте функцию `print()` с текстом в кавычках'
        WHEN 'py-strings' THEN 'Присвойте строку переменной: `name = "Imperion"`'
        WHEN 'py-numbers' THEN 'Сложите числа: `1 + 2 + 3 + 4 + 5`'
        WHEN 'py-conditions' THEN 'Используйте оператор `%` для проверки остатка от деления'
        WHEN 'py-loops' THEN 'Используйте `for i in range(5):`'
        WHEN 'py-lists' THEN 'Используйте функцию `sum()` для подсчёта суммы'
        WHEN 'py-functions' THEN 'Используйте f-строки: `return f"Hello, {name}!"`'
        WHEN 'js-hello' THEN 'Используйте `console.log("текст")`'
        WHEN 'js-variables' THEN 'Используйте `const message = "JavaScript";`'
        WHEN 'js-loops' THEN 'Используйте `for (let i = 0; i < 5; i++)`'
        WHEN 'cpp-hello' THEN 'Используйте `cout << "Hello, world!" << endl;`'
        WHEN 'cpp-loops' THEN 'Используйте `for (int i = 0; i < 5; i++)`'
        WHEN 'c-hello' THEN 'Используйте `printf("Hello, world!\\n");`'
        WHEN 'go-hello' THEN 'Используйте `fmt.Println("Hello, world!")`'
        ELSE 'Внимательно прочитайте условие задачи'
    END,
    5
FROM public.lesson_items li
JOIN public.lessons l ON l.id = li.lesson_id
WHERE l.slug IN (
    'py-hello', 'py-strings', 'py-numbers', 'py-conditions', 'py-loops', 
    'py-lists', 'py-functions', 'js-hello', 'js-variables', 'js-loops',
    'cpp-hello', 'cpp-loops', 'c-hello', 'go-hello'
);

-- ============================================================================
-- ЧАСТЬ 15: ТЕСТОВЫЕ ДАННЫЕ - ЛЕКЦИИ
-- ============================================================================

INSERT INTO public.lectures (slug, language, title, summary, order_index, published) VALUES
    -- Python лекции
    ('py-intro', 'python', 'Введение в Python', 'Знакомство с языком Python, его особенности и применение', 1, TRUE),
    ('py-basics', 'python', 'Python: Основы синтаксиса', 'Базовый синтаксис, переменные, типы данных', 2, TRUE),
    ('py-oop', 'python', 'Python: ООП', 'Объектно-ориентированное программирование в Python', 3, TRUE),
    
    -- JavaScript лекции
    ('js-intro', 'javascript', 'Введение в JavaScript', 'История и особенности языка', 4, TRUE),
    ('js-basics', 'javascript', 'JavaScript: Основы', 'Переменные, типы, операторы', 5, TRUE),
    ('js-dom', 'javascript', 'JavaScript: DOM', 'Работа с Document Object Model', 6, TRUE),
    
    -- C++ лекции
    ('cpp-intro', 'cpp', 'Введение в C++', 'История языка и области применения', 7, TRUE),
    ('cpp-basics', 'cpp', 'C++: Основы', 'Базовый синтаксис C++', 8, TRUE),
    ('cpp-memory', 'cpp', 'C++: Управление памятью', 'Указатели, ссылки, динамическая память', 9, TRUE),
    
    -- C лекции
    ('c-intro', 'c', 'Введение в C', 'Язык C - основа системного программирования', 10, TRUE),
    ('c-basics', 'c', 'C: Основы', 'Базовый синтаксис языка C', 11, TRUE),
    
    -- Go лекции
    ('go-intro', 'go', 'Введение в Go', 'Современный язык от Google', 12, TRUE),
    ('go-basics', 'go', 'Go: Основы', 'Базовый синтаксис Go', 13, TRUE),
    ('go-concurrency', 'go', 'Go: Конкурентность', 'Горутины и каналы', 14, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    language = EXCLUDED.language,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    order_index = EXCLUDED.order_index,
    published = EXCLUDED.published;

-- ============================================================================
-- ЧАСТЬ 16: ТЕСТОВЫЕ ДАННЫЕ - СЕКЦИИ ЛЕКЦИЙ
-- ============================================================================

-- Удаляем старые секции
DELETE FROM public.lecture_sections;

-- Python Intro
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Что такое Python?', 1,
E'# Что такое Python?

Python — высокоуровневый язык программирования общего назначения.

## Особенности
- Простой и читаемый синтаксис
- Интерпретируемый язык
- Динамическая типизация
- Большая стандартная библиотека

## Применение
- Веб-разработка (Django, Flask)
- Анализ данных (Pandas, NumPy)
- Машинное обучение (TensorFlow, PyTorch)
- Автоматизация и скрипты'
FROM public.lectures l WHERE l.slug = 'py-intro';

INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Установка Python', 2,
E'# Установка Python

## Windows
1. Скачайте установщик с python.org
2. Запустите и выберите "Add Python to PATH"
3. Нажмите Install Now

## macOS
```bash
brew install python
```

## Linux
```bash
sudo apt install python3
```

## Проверка установки
```bash
python --version
```'
FROM public.lectures l WHERE l.slug = 'py-intro';

-- Python Basics
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Переменные', 1,
E'# Переменные в Python

Переменные создаются присваиванием:

```python
x = 10
name = "Imperion"
pi = 3.14
active = True
```

## Правила именования
- Начинаются с буквы или `_`
- Содержат буквы, цифры, `_`
- Чувствительны к регистру'
FROM public.lectures l WHERE l.slug = 'py-basics';

INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Типы данных', 2,
E'# Типы данных

## Числа
- `int` — целые: `42`
- `float` — с плавающей точкой: `3.14`

## Строки
```python
s = "Hello"
s = ''World''
s = """Многострочный
текст"""
```

## Булевы
```python
True
False
```

## None
```python
x = None  # отсутствие значения
```'
FROM public.lectures l WHERE l.slug = 'py-basics';

-- JavaScript Intro
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'История JavaScript', 1,
E'# История JavaScript

JavaScript создан Бренданом Айком в 1995 году за 10 дней.

## Эволюция
- 1995: JavaScript 1.0 в Netscape
- 1997: ECMAScript стандарт
- 2009: ES5
- 2015: ES6 (ES2015) — современный JavaScript
- Ежегодные обновления с 2016'
FROM public.lectures l WHERE l.slug = 'js-intro';

INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Где используется', 2,
E'# Где используется JavaScript

## Браузер
- Интерактивность страниц
- Single Page Applications
- Анимации

## Сервер
- Node.js
- Deno
- Bun

## Мобильные приложения
- React Native
- Ionic

## Desktop
- Electron (VS Code, Discord)'
FROM public.lectures l WHERE l.slug = 'js-intro';

-- JavaScript Basics
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Переменные', 1,
E'# Переменные в JavaScript

## let
Переменная, значение которой можно изменить:
```javascript
let count = 0;
count = 1;
```

## const
Константа, значение нельзя переопределить:
```javascript
const PI = 3.14;
// PI = 3; // Ошибка!
```

## var (устаревший)
```javascript
var old = "не используйте";
```'
FROM public.lectures l WHERE l.slug = 'js-basics';

-- C++ Intro
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'История C++', 1,
E'# История C++

C++ создан Бьёрном Страуструпом в 1979 году как расширение языка C.

## Основные версии
- 1983: C++ (изначально "C with Classes")
- 1998: C++98 — первый стандарт
- 2011: C++11 — современный C++
- 2014, 2017, 2020: Регулярные обновления'
FROM public.lectures l WHERE l.slug = 'cpp-intro';

INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Структура программы', 2,
E'# Структура программы C++

```cpp
#include <iostream>  // Подключение библиотеки

using namespace std;  // Пространство имён

int main() {  // Главная функция
    cout << "Hello!" << endl;
    return 0;  // Код возврата
}
```

## Компиляция
```bash
g++ program.cpp -o program
./program
```'
FROM public.lectures l WHERE l.slug = 'cpp-intro';

-- Go Intro
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Что такое Go?', 1,
E'# Что такое Go?

Go (Golang) — язык программирования, созданный в Google в 2009 году.

## Создатели
- Роберт Гризмер
- Роб Пайк
- Кен Томпсон

## Особенности
- Простота
- Быстрая компиляция
- Встроенная конкурентность
- Сборка мусора
- Статическая типизация'
FROM public.lectures l WHERE l.slug = 'go-intro';

INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'Первая программа', 2,
E'# Первая программа на Go

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

## Запуск
```bash
go run main.go
```

## Компиляция
```bash
go build main.go
./main
```'
FROM public.lectures l WHERE l.slug = 'go-intro';

-- C Intro
INSERT INTO public.lecture_sections (lecture_id, title, order_index, content_markdown)
SELECT l.id, 'История C', 1,
E'# История языка C

C создан Деннисом Ритчи в Bell Labs в 1972 году.

## Влияние
Язык C повлиял на:
- C++
- Java
- C#
- JavaScript
- Go
- Rust

## Применение
- Операционные системы (Linux, Windows)
- Embedded системы
- Драйверы
- Компиляторы'
FROM public.lectures l WHERE l.slug = 'c-intro';

-- ============================================================================
-- ЧАСТЬ 17: ЗАВЕРШЕНИЕ
-- ============================================================================

-- Обновляем статистику для оптимизатора запросов
ANALYZE;

-- Выводим статистику
DO $$
DECLARE
    lessons_count INTEGER;
    lectures_count INTEGER;
    achievements_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO lessons_count FROM public.lessons WHERE published = TRUE;
    SELECT COUNT(*) INTO lectures_count FROM public.lectures WHERE published = TRUE;
    SELECT COUNT(*) INTO achievements_count FROM public.achievements WHERE published = TRUE;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'БАЗА ДАННЫХ IMPERION УСПЕШНО СОЗДАНА';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Уроков: %', lessons_count;
    RAISE NOTICE 'Лекций: %', lectures_count;
    RAISE NOTICE 'Достижений: %', achievements_count;
    RAISE NOTICE '============================================';
END $$;
