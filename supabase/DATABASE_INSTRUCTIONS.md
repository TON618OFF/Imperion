# Инструкция по запуску базы данных Imperion в Supabase

## Обзор

Скрипт `database_complete.sql` содержит полную структуру базы данных для платформы Imperion, включая:

- 17 таблиц с ограничениями и индексами
- 13 функций (включая SECURITY DEFINER)
- 15 триггеров
- 1 представление (view)
- Полные RLS-политики (Row Level Security)
- 15 достижений
- 45 уроков (9 на каждый язык: Python, JavaScript, C++, C, Go)
- 14 лекций с секциями
- Подсказки к урокам

---

## Подготовка

### 1. Создайте проект в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Войдите в аккаунт или зарегистрируйтесь
3. Нажмите **New Project**
4. Заполните:
   - **Name**: `imperion` (или другое название)
   - **Database Password**: сохраните надёжный пароль
   - **Region**: выберите ближайший регион (например, `Frankfurt (eu-central-1)`)
5. Нажмите **Create new project**
6. Дождитесь создания проекта (1-2 минуты)

### 2. Получите данные для подключения

После создания проекта:

1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://xyzabc123.supabase.co`)
   - **anon public** key
   - **service_role** key (для администрирования)

---

## Запуск скрипта

### Способ 1: Через SQL Editor (рекомендуется)

1. В панели Supabase перейдите в **SQL Editor** (левое меню)
2. Нажмите **New query**
3. Скопируйте **весь** содержимое файла `database_complete.sql`
4. Вставьте в редактор
5. Нажмите **Run** (или `Ctrl+Enter` / `Cmd+Enter`)

**Важно**: Скрипт выполняется целиком за один запуск. Время выполнения: ~10-30 секунд.

### Способ 2: Через Supabase CLI

Если установлен Supabase CLI:

```bash
# Войдите в аккаунт
supabase login

# Свяжите с проектом
supabase link --project-ref YOUR_PROJECT_REF

# Запустите скрипт
supabase db push
```

### Способ 3: Через psql (для продвинутых)

```bash
# Подключение напрямую к базе данных
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f database_complete.sql
```

Данные подключения можно найти в **Settings** → **Database** → **Connection string**.

---

## Проверка успешности

После выполнения скрипта проверьте:

### 1. Таблицы

Перейдите в **Table Editor**. Должны появиться таблицы:
- `profiles`
- `user_settings`
- `user_xp`
- `user_streaks`
- `lessons` (45 записей)
- `lesson_items`
- `lesson_hints`
- `lectures` (14 записей)
- `lecture_sections`
- `xp_transactions`
- `user_lesson_progress`
- `user_lesson_item_progress`
- `user_lecture_progress`
- `code_submissions`
- `user_hint_usage`
- `achievements` (15 записей)
- `user_achievements`

### 2. Функции

Перейдите в **Database** → **Functions**. Должны быть функции:
- `bootstrap_current_user`
- `complete_lesson`
- `complete_lecture`
- `compute_level`
- `evaluate_lesson_submission`
- `award_achievement`
- и другие

### 3. Storage

Перейдите в **Storage**. Должен быть bucket:
- `avatars` (публичный)

---

## Настройка проекта

### 1. Обновите переменные окружения

В файле `.env` (или `.env.local`) вашего проекта укажите:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Проверьте Authentication

В Supabase Dashboard:
1. Перейдите в **Authentication** → **Providers**
2. Убедитесь, что **Email** включён
3. (Опционально) Настройте **Email Templates** для русского языка

### 3. Настройте Email (опционально)

По умолчанию Supabase использует встроенный SMTP. Для production:
1. Перейдите в **Settings** → **Auth** → **SMTP Settings**
2. Настройте свой SMTP сервер (SendGrid, Mailgun, и т.д.)

---

## Создание тестового пользователя

### Через UI

1. Запустите приложение локально
2. Зарегистрируйтесь через форму

### Через SQL (для тестирования)

```sql
-- Создаём пользователя напрямую в auth.users
-- ВНИМАНИЕ: Только для тестирования! В production используйте UI

-- Получите UUID созданного пользователя и выполните:
SELECT public.bootstrap_current_user();
```

---

## Повторный запуск скрипта

Скрипт спроектирован для **идемпотентности** — его можно запускать повторно:

1. Скрипт **полностью удаляет** схему `public` и создаёт заново
2. Все данные пользователей будут **удалены** (кроме auth.users)
3. Триггер на `auth.users` пересоздаётся

**Внимание**: Если у вас есть важные данные пользователей, сначала сделайте бэкап!

---

## Устранение неполадок

### Ошибка "permission denied"

Убедитесь, что вы запускаете скрипт с правами `postgres` (владелец базы).

### Ошибка с auth.users

Триггер `on_auth_user_created` создаётся на таблице `auth.users`. Если возникает ошибка, выполните:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Затем запустите скрипт снова.

### Ошибка "relation already exists"

Скрипт начинается с `DROP SCHEMA IF EXISTS public CASCADE;`, поэтому таких ошибок быть не должно. Если они возникают, выполните вручную:

```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
```

### RLS-ошибки при работе приложения

Если после запуска возникают ошибки типа "violates row-level security policy":

1. Проверьте, что пользователь аутентифицирован
2. Убедитесь, что вызывается `bootstrap_current_user()` после входа
3. Проверьте логи в **Database** → **Logs**

---

## Структура RLS-политик

### user_lesson_progress (исправленная политика)

Ключевое исправление — пользователь может установить статус `'завершён'` **только если**:
1. Есть успешная отправка кода (`code_submissions.passed = TRUE`) для данного урока
2. Пользователь — владелец записи

Это предотвращает мошенничество, но позволяет клиентскому коду работать корректно.

### code_submissions

Пользователь может:
- Видеть только свои отправки
- Создавать отправки от своего имени
- Менторы и админы видят все отправки

---

## Полезные запросы

### Статистика базы данных

```sql
SELECT 
    (SELECT COUNT(*) FROM lessons WHERE published) as lessons,
    (SELECT COUNT(*) FROM lectures WHERE published) as lectures,
    (SELECT COUNT(*) FROM achievements WHERE published) as achievements,
    (SELECT COUNT(*) FROM profiles) as users;
```

### Топ пользователей

```sql
SELECT p.username, ux.xp, ux.level
FROM user_xp ux
JOIN profiles p ON p.id = ux.user_id
ORDER BY ux.xp DESC
LIMIT 10;
```

### Прогресс пользователя

```sql
SELECT 
    u.email,
    COUNT(ulp.*) FILTER (WHERE ulp.status = 'завершён') as completed_lessons
FROM auth.users u
LEFT JOIN user_lesson_progress ulp ON ulp.user_id = u.id
GROUP BY u.id;
```

---

## Контакты и поддержка

При возникновении проблем:
1. Проверьте логи в Supabase Dashboard
2. Изучите документацию Supabase
3. Создайте issue в репозитории проекта

---

## Версионирование

- **Версия скрипта**: 2.0
- **Версия проекта**: v0.5.0
- **Совместимость**: Supabase (PostgreSQL 15+)
- **Дата обновления**: Февраль 2026
