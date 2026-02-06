# Руководство для разработчиков Imperion

Спасибо за интерес к разработке Imperion! Это руководство поможет вам начать работу над проектом.

## Содержание

- [Начало работы](#начало-работы)
- [Структура проекта](#структура-проекта)
- [Стандарты кодирования](#стандарты-кодирования)
- [Работа с Git](#работа-с-git)
- [Тестирование](#тестирование)
- [Добавление новых функций](#добавление-новых-функций)
- [База данных](#база-данных)

## Начало работы

### Требования

- Node.js 16+
- npm или yarn
- Git
- Аккаунт Supabase

### Установка

1. Форкните репозиторий
2. Клонируйте свой форк:
```bash
git clone https://github.com/YOUR_USERNAME/Imperion.git
cd Imperion
```

3. Установите зависимости:
```bash
npm install
```

4. Настройте переменные окружения (см. `DATABASE_SETUP.md`)

5. Запустите проект:
```bash
npm run dev
```

## Структура проекта

```
Imperion/
├── src/
│   ├── auth/              # Логика аутентификации (AuthProvider)
│   ├── components/        # React компоненты
│   │   ├── ui/           # UI компоненты (shadcn/ui)
│   │   └── landing/      # Компоненты лендинга
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Утилиты и вспомогательные функции
│   ├── pages/            # Страницы приложения
│   │   ├── admin/       # Панель администратора
│   │   ├── app/         # Основное приложение
│   │   ├── mentor/      # Панель ментора
│   │   ├── Auth.tsx     # Страница авторизации
│   │   └── Index.tsx    # Лендинг
│   ├── App.tsx           # Главный компонент приложения
│   └── main.tsx          # Точка входа
├── supabase/
│   └── database_complete.sql  # Полная схема БД с данными
└── public/               # Статические файлы
```

## Стандарты кодирования

### TypeScript

- Используйте TypeScript для всех новых файлов
- Определяйте типы для props, state и API ответов
- Избегайте использования `any`, используйте `unknown` если необходимо

```typescript
// ✅ Хорошо
type UserProfile = {
  id: string;
  username: string;
  role: "пользователь" | "ментор" | "администратор";
};

// ❌ Плохо
const profile: any = {...};
```

### React компоненты

- Используйте функциональные компоненты с хуками
- Именуйте компоненты в PascalCase
- Используйте деструктуризацию для props

```typescript
// ✅ Хорошо
export default function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({...});
  
  if (isLoading) return <LoadingSpinner />;
  
  return <div>...</div>;
}
```

### Стилизация

- Используйте Tailwind CSS классы
- Следуйте существующей цветовой схеме
- Используйте компоненты из `@/components/ui`

```typescript
// ✅ Хорошо
<Button variant="imperial" className="w-full">
  Сохранить
</Button>

// ❌ Плохо
<button style={{ backgroundColor: '#f59e0b' }}>
  Сохранить
</button>
```

### Именование

- **Файлы**: PascalCase для компонентов, camelCase для утилит
- **Функции**: camelCase
- **Константы**: UPPER_SNAKE_CASE
- **Типы**: PascalCase

```typescript
// Файлы
UserProfile.tsx
formatDate.ts

// Код
const MAX_ATTEMPTS = 3;
type LessonData = {...};
function fetchUserData() {...}
```

## Работа с Git

### Ветки

- `main` — стабильная версия
- `develop` — разработка
- `feature/название-функции` — новые функции
- `bugfix/название-бага` — исправления
- `hotfix/название` — срочные исправления

### Коммиты

Используйте префиксы для коммитов:

- `feat:` — новая функция
- `fix:` — исправление бага
- `docs:` — документация
- `style:` — форматирование кода
- `refactor:` — рефакторинг
- `test:` — тесты
- `chore:` — обновление зависимостей и т.д.

Примеры:
```
feat: добавить панель администратора
fix: исправить статусы уроков на русский
docs: обновить README с инструкциями
refactor: оптимизировать запросы к БД
```

### Pull Request

1. Создайте ветку от `develop`
2. Внесите изменения
3. Убедитесь что код проходит линтинг: `npm run lint`
4. Создайте PR в `develop` с описанием:
   - Что изменено
   - Почему изменено
   - Как протестировать

## Тестирование

### Запуск тестов

```bash
# Запустить все тесты
npm test

# Запустить тесты в watch режиме
npm run test:watch
```

### Написание тестов

Используйте React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
  
  it('should handle click', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    // assertions
  });
});
```

## Добавление новых функций

### Добавление нового языка программирования

1. Обновите enum в `database_complete.sql`:
```sql
create type public.programming_language as enum ('python','javascript','cpp','c','go','новый_язык');
```

2. Добавьте уроки и лекции в соответствующие секции `database_complete.sql`

3. Обновите компоненты для поддержки нового языка

### Добавление новой роли

1. Обновите enum в `database_complete.sql`:
```sql
create type public.user_role as enum ('пользователь','ментор','администратор','новая_роль');
```

2. Добавьте политики безопасности для новой роли

3. Обновите `RoleProtectedRoute` для проверки роли

4. Создайте страницы/панели для новой роли

### Добавление нового статуса прогресса

1. Обновите enum в `database_complete.sql`:
```sql
create type public.progress_status as enum ('не_начат','в_процессе','завершён','новый_статус');
```

2. Обновите функции для работы с новым статусом

3. Обновите UI компоненты для отображения статуса

## База данных

### Изменение схемы

1. Внесите изменения в `supabase/database_complete.sql`
2. Протестируйте изменения локально
3. Создайте миграцию:
```sql
-- Добавьте комментарий с датой и описанием
-- Migration: 2026-02-06 - Добавление нового поля
ALTER TABLE public.lessons ADD COLUMN new_field TEXT;
```

### Работа с Supabase

#### React Query + Supabase

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const { data, isLoading } = useQuery({
  queryKey: ['lessons', language],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('language', language);
    if (error) throw error;
    return data;
  },
});
```

#### Мутации

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (lesson: Lesson) => {
    const { error } = await supabase
      .from('lessons')
      .insert(lesson);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
  },
});
```

### RLS Политики

При добавлении новых таблиц обязательно настройте Row Level Security:

```sql
alter table public.new_table enable row level security;

create policy "Users can read own data"
  on public.new_table for select
  to authenticated
  using (auth.uid() = user_id);
```

## Оптимизация производительности

- Используйте `useMemo` для дорогих вычислений
- Используйте `useCallback` для функций в зависимостях
- Избегайте ненужных ре-рендеров
- Используйте пагинацию для больших списков
- Оптимизируйте SQL запросы с индексами

## Доступность (A11y)

- Используйте семантические HTML теги
- Добавляйте `aria-label` для интерактивных элементов
- Обеспечьте навигацию с клавиатуры
- Проверяйте контрастность цветов

## Безопасность

- **Никогда** не коммитьте `.env` файлы
- Используйте RLS политики Supabase
- Проверяйте роли пользователей на backend
- Санитизируйте пользовательский ввод
- Используйте prepared statements для SQL

## Вопросы?

Если у вас есть вопросы:
1. Проверьте существующую документацию
2. Посмотрите похожий код в проекте
3. Создайте issue в GitHub

Спасибо за ваш вклад в Imperion! 🚀

---

**Версия:** v0.5.0 | Февраль 2026