# ▲ Деплой Imperion на Vercel

Пошаговая инструкция для production-развёртывания проекта `React + Vite + Supabase + Piston API`.

## 1) Что уже настроено в проекте

- `vercel.json` добавлен для:
  - сборки через `npm run build`
  - публикации директории `dist`
  - SPA rewrite (`react-router-dom`) на `index.html`
- Добавлена серверная функция `api/piston-execute.ts`:
  - фронтенд больше не отправляет Piston ключ из браузера в production
  - ключ берётся из server-side env: `PISTON_API_KEY`

## 2) Переменные окружения в Vercel

В Vercel Project Settings -> Environment Variables добавьте:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
PISTON_API_KEY=<optional-piston-whitelist-key>
```

Пояснения:
- `VITE_SUPABASE_URL` — URL Supabase проекта
- `VITE_SUPABASE_ANON_KEY` — публичный anon key
- `PISTON_API_KEY` — опционально, если вашему проекту нужен whitelist-доступ к Piston

## 3) Деплой через Vercel UI (рекомендуется)

1. Зайдите на [https://vercel.com/new](https://vercel.com/new)
2. Импортируйте Git-репозиторий с проектом
3. Framework preset: **Vite** (обычно определяется автоматически)
4. Проверьте Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Добавьте env-переменные из шага 2
6. Нажмите **Deploy**

## 4) Деплой через Vercel CLI (альтернатива)

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

После первого запуска CLI свяжет проект с Vercel.
Env-переменные лучше задать в панели Vercel (Project Settings -> Environment Variables).

## 5) Проверка после деплоя

Проверьте:
- открытие маршрутов напрямую (`/auth`, `/app`, `/admin`, `/mentor`) без 404
- регистрацию и вход через Supabase
- запуск кода в уроках (через `/api/piston-execute`)

Если запуск кода не работает:
- проверьте, что в Vercel задан `PISTON_API_KEY` (если нужен whitelist)
- откройте вкладку Functions/Logs в Vercel и проверьте ответы `api/piston-execute`

## 6) Локальная разработка

Локально (`npm run dev`) функция Vercel не используется.
Для локального запуска кода можно задать в `.env.local`:

```env
VITE_PISTON_API_KEY=<optional_local_dev_key>
```

Без этого ключа локальный запуск может работать ограниченно (зависит от ограничений публичного Piston API).
