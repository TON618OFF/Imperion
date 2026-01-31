-- Seed data for Imperion-Pro (content tables). Does NOT create users in auth.users.
-- Run in Supabase SQL Editor.

begin;

-- ---------- LESSONS (published) ----------
insert into public.lessons (slug, title, description, type, difficulty, language, order_index, estimated_minutes, published)
values
  ('py-hello', 'Python: Hello World', 'Первый запуск кода и базовый вывод', 'practice', 'лёгкий', 'python', 1, 10, true),
  ('js-hello', 'JavaScript: Hello World', 'Базовый вывод в консоль', 'practice', 'лёгкий', 'javascript', 2, 10, true),
  ('cpp-hello', 'C++: Hello World', 'Структура программы и вывод', 'practice', 'лёгкий', 'cpp', 3, 15, true),
  ('c-hello', 'C: Hello World', 'Базовая программа на C', 'practice', 'лёгкий', 'c', 4, 15, true),
  ('go-hello', 'Go: Hello World', 'Первая программа на Go', 'practice', 'лёгкий', 'go', 5, 12, true),
  ('py-strings', 'Python: Строки', 'Конкатенация и форматирование', 'theory', 'лёгкий', 'python', 6, 12, true),
  ('js-variables', 'JavaScript: Переменные', 'Работа с переменными', 'practice', 'средний', 'javascript', 7, 15, true),
  ('cpp-loops', 'C++: Циклы', 'Введение в циклы', 'practice', 'средний', 'cpp', 8, 20, true),
  ('c-arrays', 'C: Массивы', 'Основы работы с массивами', 'practice', 'средний', 'c', 9, 25, true),
  ('go-functions', 'Go: Функции', 'Создание функций', 'practice', 'средний', 'go', 10, 20, true),
  ('py-advanced', 'Python: Продвинутый уровень', 'Сложные структуры данных', 'practice', 'сложный', 'python', 11, 30, true),
  ('js-async', 'JavaScript: Асинхронность', 'Promise и async/await', 'practice', 'сложный', 'javascript', 12, 35, true),
  ('cpp-pointers', 'C++: Указатели', 'Работа с указателями', 'practice', 'сложный', 'cpp', 13, 40, true),
  ('c-pointers', 'C: Указатели', 'Продвинутая работа с указателями', 'practice', 'сложный', 'c', 14, 40, true),
  ('go-goroutines', 'Go: Горутины', 'Параллельное программирование', 'practice', 'сложный', 'go', 15, 35, true)
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    type = excluded.type,
    difficulty = excluded.difficulty,
    language = excluded.language,
    order_index = excluded.order_index,
    estimated_minutes = excluded.estimated_minutes,
    published = excluded.published;

delete from public.lesson_hints
where item_id in (
  select li.id
  from public.lesson_items li
  join public.lessons l on l.id = li.lesson_id
  where l.slug in ('py-hello','js-hello','cpp-hello','c-hello','go-hello','py-strings','js-variables','cpp-loops','c-arrays','go-functions','py-advanced','js-async','cpp-pointers','c-pointers','go-goroutines')
);

delete from public.lesson_items
where lesson_id in (
  select id from public.lessons where slug in ('py-hello','js-hello','cpp-hello','c-hello','go-hello','py-strings','js-variables','cpp-loops','c-arrays','go-functions','py-advanced','js-async','cpp-pointers','c-pointers','go-goroutines')
);

-- First lesson item per lesson
insert into public.lesson_items (lesson_id, order_index, content_markdown, starter_code, tests)
select l.id, 1,
       case l.slug
         when 'py-hello' then
           E'# Уровень 1 · Hello World\n\nВ этом задании ты сделаешь первый корректный вывод в stdout.\n\n## Требования\n- Выведи **ровно** строку `Hello, world!`\n- Вывод должен быть в stdout (не в stderr)\n- Без лишних символов (пробелов в конце строки, дополнительных строк)\n\n## Формат\n- **Ввод:** отсутствует\n- **Вывод:** одна строка\n\n## Подсказка\nИспользуй `print()`.'
         when 'js-hello' then
           E'# Уровень 1 · Hello World\n\nТы пишешь первую программу на JS и выводишь результат в stdout.\n\n## Требования\n- Выведи **ровно** строку `Hello, world!`\n- Используй stdout (обычный вывод)\n- Без лишних символов/строк\n\n## Формат\n- **Ввод:** отсутствует\n- **Вывод:** одна строка\n\n## Подсказка\nИспользуй `console.log()`.'
         when 'cpp-hello' then
           E'# Уровень 1 · Hello World\n\nЦель — скомпилировать и выполнить программу, которая печатает строку.\n\n## Требования\n- Выведи **ровно** строку `Hello, world!`\n- Программа должна завершаться с кодом `0`\n- Без лишних символов/строк\n\n## Формат\n- **Ввод:** отсутствует\n- **Вывод:** одна строка\n\n## Подсказка\nИспользуй `cout` и `endl`.'
         when 'c-hello' then
           E'# Уровень 1 · Hello World\n\nБазовая программа на C с выводом текста.\n\n## Требования\n- Выведи **ровно** строку `Hello, world!`\n- Программа должна завершаться с кодом `0`\n- Без лишних символов/строк\n\n## Формат\n- **Ввод:** отсутствует\n- **Вывод:** одна строка\n\n## Подсказка\nИспользуй `printf()`.'
         when 'go-hello' then
           E'# Уровень 1 · Hello World\n\nПервая программа на Go.\n\n## Требования\n- Выведи **ровно** строку `Hello, world!`\n- Без лишних символов/строк\n\n## Формат\n- **Ввод:** отсутствует\n- **Вывод:** одна строка\n\n## Подсказка\nИспользуй `fmt.Println()`.'
         when 'py-strings' then
           E'# Уровень 2 · Строки\n\nКороткое задание на работу со строками.\n\n## Теория\n- Конкатенация: `"a" + "b"`\n- f-строки: `f"x={x}"`\n\n## Требования\n- Сформируй строку `Imperion` (любым способом)\n- Выведи её в stdout\n- Без лишних символов\n\n## Формат\n- **Ввод:** отсутствует\n- **Вывод:** одна строка\n'
         else '# Задание\n\nВыполни задание согласно описанию.'
       end,
       case l.slug
         when 'py-hello' then E'print("Hello, world!")\n'
         when 'js-hello' then E'console.log(''Hello, world!'');\n'
         when 'cpp-hello' then E'#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n  cout << "Hello, world!" << endl;\n  return 0;\n}\n'
         when 'c-hello' then E'#include <stdio.h>\n\nint main(){\n  printf("Hello, world!\\n");\n  return 0;\n}\n'
         when 'go-hello' then E'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, world!")\n}\n'
         when 'py-strings' then E'name = "Imperion"\nprint(name)\n'
         when 'js-variables' then E'let message = "JavaScript";\nconsole.log(message);\n'
         when 'cpp-loops' then E'#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n  for(int i = 0; i < 5; i++){\n    cout << i << endl;\n  }\n  return 0;\n}\n'
         when 'c-arrays' then E'#include <stdio.h>\n\nint main(){\n  int arr[3] = {1, 2, 3};\n  for(int i = 0; i < 3; i++){\n    printf("%d\\n", arr[i]);\n  }\n  return 0;\n}\n'
         when 'go-functions' then E'package main\n\nimport "fmt"\n\nfunc greet(name string) string {\n  return "Hello, " + name\n}\n\nfunc main() {\n  fmt.Println(greet("Go"))\n}\n'
         else ''
       end,
       case l.slug
         when 'py-hello' then jsonb_build_object('expected_stdout','Hello, world!')
         when 'js-hello' then jsonb_build_object('expected_stdout','Hello, world!')
         when 'cpp-hello' then jsonb_build_object('expected_stdout','Hello, world!')
         when 'c-hello' then jsonb_build_object('expected_stdout','Hello, world!')
         when 'go-hello' then jsonb_build_object('expected_stdout','Hello, world!')
         when 'py-strings' then jsonb_build_object('expected_stdout','Imperion')
         when 'js-variables' then jsonb_build_object('expected_stdout','JavaScript')
         when 'cpp-loops' then jsonb_build_object('expected_stdout',E'0\n1\n2\n3\n4')
         when 'c-arrays' then jsonb_build_object('expected_stdout',E'1\n2\n3')
         when 'go-functions' then jsonb_build_object('expected_stdout','Hello, Go')
         else '{}'::jsonb
       end
from public.lessons l
where l.slug in ('py-hello','js-hello','cpp-hello','c-hello','go-hello','py-strings','js-variables','cpp-loops','c-arrays','go-functions','py-advanced','js-async','cpp-pointers','c-pointers','go-goroutines')
on conflict do nothing;

-- Hints
insert into public.lesson_hints (item_id, order_index, hint_markdown, penalty_xp)
select li.id, 1,
       case l.slug
         when 'py-hello' then 'Сначала попробуйте: `print("Hello, world!")`'
         when 'js-hello' then 'Сначала попробуйте: `console.log("Hello, world!")`'
         when 'cpp-hello' then 'Не забудьте `return 0;`'
         when 'c-hello' then 'Используйте `printf("Hello, world!\\n");`'
         when 'go-hello' then 'Используйте `fmt.Println("Hello, world!")`'
         when 'py-strings' then 'Используйте переменную `name` и `print(name)`'
         when 'js-variables' then 'Объявите переменную через `let` или `const`'
         when 'cpp-loops' then 'Используйте цикл `for(int i = 0; i < 5; i++)`'
         when 'c-arrays' then 'Объявите массив: `int arr[3] = {1, 2, 3};`'
         when 'go-functions' then 'Функция должна возвращать string'
         else 'Подсказка'
       end,
       0
from public.lesson_items li
join public.lessons l on l.id = li.lesson_id
where l.slug in ('py-hello','js-hello','cpp-hello','c-hello','go-hello','py-strings','js-variables','cpp-loops','c-arrays','go-functions','py-advanced','js-async','cpp-pointers','c-pointers','go-goroutines')
on conflict do nothing;

-- ---------- LECTURES (published) ----------
insert into public.lectures (slug, language, title, summary, order_index, published)
values
  ('py-basics', 'python', 'Python: основы', 'Переменные, вывод, типы данных', 1, true),
  ('js-basics', 'javascript', 'JavaScript: основы', 'Переменные, вывод, базовые типы', 2, true),
  ('cpp-basics', 'cpp', 'C++: основы', 'Введение в C++, типы данных', 3, true),
  ('c-basics', 'c', 'C: основы', 'Основы языка C', 4, true),
  ('go-basics', 'go', 'Go: основы', 'Введение в Go, основной синтаксис', 5, true)
on conflict (slug) do update
set language = excluded.language,
    title = excluded.title,
    summary = excluded.summary,
    order_index = excluded.order_index,
    published = excluded.published;

delete from public.lecture_sections
where lecture_id in (
  select id from public.lectures where slug in ('py-basics','js-basics','cpp-basics','c-basics','go-basics')
);

insert into public.lecture_sections (lecture_id, title, order_index, content_markdown)
select lec.id,
       s.title,
       s.order_index,
       s.content_markdown
from public.lectures lec
join (values
  ('py-basics', 'Введение', 1, E'# Введение\n\nPython — интерпретируемый язык.\n\n```py\nprint("Hello")\n```\n'),
  ('py-basics', 'Переменные', 2, E'# Переменные\n\nПеременные создаются присваиванием:\n\n```py\nx = 10\nname = "Imperion"\n```\n'),
  ('js-basics', 'Введение', 1, E'# Введение\n\nJavaScript работает в браузере и на сервере (Node.js).\n\n```js\nconsole.log("Hello")\n```\n'),
  ('js-basics', 'Переменные', 2, E'# Переменные\n\n`let/const` для объявления:\n\n```js\nconst x = 10;\nlet name = "Imperion";\n```\n'),
  ('cpp-basics', 'Введение', 1, E'# Введение\n\nC++ — мощный компилируемый язык.\n\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello" << endl;\n  return 0;\n}\n```\n'),
  ('cpp-basics', 'Переменные', 2, E'# Переменные\n\nПеременные имеют строгую типизацию:\n\n```cpp\nint x = 10;\nstring name = "Imperion";\n```\n'),
  ('c-basics', 'Введение', 1, E'# Введение\n\nC — один из старейших языков программирования.\n\n```c\n#include <stdio.h>\n\nint main() {\n  printf("Hello\\n");\n  return 0;\n}\n```\n'),
  ('c-basics', 'Переменные', 2, E'# Переменные\n\nПеременные объявляются с указанием типа:\n\n```c\nint x = 10;\nchar name[] = "Imperion";\n```\n'),
  ('go-basics', 'Введение', 1, E'# Введение\n\nGo — современный язык от Google.\n\n```go\npackage main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello")\n}\n```\n'),
  ('go-basics', 'Переменные', 2, E'# Переменные\n\nПеременные объявляются через `:=` или `var`:\n\n```go\nx := 10\nvar name string = "Imperion"\n```\n')
) as s(slug, title, order_index, content_markdown)
  on s.slug = lec.slug
on conflict do nothing;

-- ---------- ACHIEVEMENTS (ensure published) ----------
update public.achievements
set published = true
where slug in (
  'first_lesson','first_lecture','streak_3','streak_7','streak_30',
  'language_mastery_python','language_mastery_javascript','language_mastery_cpp','language_mastery_c','language_mastery_go'
);

commit;

-- ---------- OPTIONAL: seed user-facing tables (requires an existing user id) ----------
-- Replace USER_ID_HERE with an existing auth.users.id (uuid) and run this block separately.
--
-- do $$
-- declare
--   v_user_id uuid := 'USER_ID_HERE';
--   v_lesson_id uuid;
-- begin
--   -- Ensure base rows exist
--   insert into public.profiles(id, first_name, last_name, username, bio)
--   values (v_user_id, 'Test', 'User', 'test_user', 'Seeded profile')
--   on conflict (id) do update set first_name=excluded.first_name, last_name=excluded.last_name, username=excluded.username, bio=excluded.bio;
--
--   insert into public.user_settings(user_id) values (v_user_id) on conflict do nothing;
--   insert into public.user_xp(user_id, xp, level) values (v_user_id, 250, public.compute_level(250))
--   on conflict (user_id) do update set xp=excluded.xp, level=excluded.level;
--
--   insert into public.user_streaks(user_id, current_streak, best_streak, last_activity_date)
--   values (v_user_id, 3, 7, (now() at time zone 'utc')::date)
--   on conflict (user_id) do update set current_streak=excluded.current_streak, best_streak=excluded.best_streak, last_activity_date=excluded.last_activity_date;
--
--   -- Mark one lesson completed for demo (triggers XP/achievements if you update via user_lesson_progress)
--   select id into v_lesson_id from public.lessons where slug = 'py-hello';
--   if v_lesson_id is not null then
--     insert into public.user_lesson_progress(user_id, lesson_id, status, started_at, completed_at)
--     values (v_user_id, v_lesson_id, 'завершён', now(), now())
--     on conflict (user_id, lesson_id) do update set status=excluded.status, completed_at=excluded.completed_at;
--   end if;
-- end $$;
