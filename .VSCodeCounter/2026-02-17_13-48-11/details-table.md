# Таблица файлов (название, язык, строки кода, вес, описание модуля)

| Название файла | Язык | Строк кода | Вес (КБ) | Описание модуля |
| :--- | :--- | ---: | ---: | :--- |
| src/App.tsx | TypeScript JSX | 86 | 3,60 | Корневой компонент: провайдеры (Query, Auth, Tooltip, Toaster), маршрутизация (React Router), объявление всех маршрутов приложения |
| src/auth/AuthProvider.tsx | TypeScript JSX | 93 | 2,90 | Контекст аутентификации: сессия, пользователь, методы входа/выхода/регистрации, подписка на изменение сессии |
| src/components/MarkdownEditor.tsx | TypeScript JSX | 198 | 6,37 | Редактор Markdown с вкладками (редактор / предпросмотр / оба) для панели ментора |
| src/components/NavLink.tsx | TypeScript JSX | 24 | 0,73 | Навигационная ссылка с поддержкой активного и отложенного состояния (обёртка над React Router NavLink) |
| src/components/ProtectedRoute.tsx | TypeScript JSX | 17 | 0,56 | Защита маршрута: проверка авторизации, редирект на /auth при отсутствии пользователя |
| src/components/RoleProtectedRoute.tsx | TypeScript JSX | 42 | 1,29 | Защита маршрута по роли: проверка роли пользователя (ментор/администратор), редирект при несоответствии |
| src/components/ScrollToTop.tsx | TypeScript JSX | 9 | 0,73 | Прокрутка страницы вверх при смене маршрута |
| src/components/landing/Features.tsx | TypeScript JSX | 116 | 5,81 | Блок «Возможности» на лендинге |
| src/components/landing/Footer.tsx | TypeScript JSX | 116 | 4,80 | Подвал лендинга |
| src/components/landing/Header.tsx | TypeScript JSX | 83 | 3,35 | Шапка лендинга с навигацией и кнопками входа |
| src/components/landing/Hero.tsx | TypeScript JSX | 113 | 5,03 | Главный блок (герой) лендинга |
| src/components/landing/LanguageCards.tsx | TypeScript JSX | 105 | 4,95 | Карточки языков программирования на лендинге |
| src/components/ui/accordion.tsx | TypeScript JSX | 45 | 1,93 | UI-компонент: аккордеон |
| src/components/ui/alert-dialog.tsx | TypeScript JSX | 91 | 4,21 | UI-компонент: диалог с предупреждением |
| src/components/ui/alert.tsx | TypeScript JSX | 37 | 1,51 | UI-компонент: алерт (уведомление) |
| src/components/ui/aspect-ratio.tsx | TypeScript JSX | 3 | 0,14 | UI-компонент: сохранение пропорций контента |
| src/components/ui/avatar.tsx | TypeScript JSX | 33 | 1,33 | UI-компонент: аватар пользователя |
| src/components/ui/badge.tsx | TypeScript JSX | 24 | 1,06 | UI-компонент: бейдж (метка) |
| src/components/ui/breadcrumb.tsx | TypeScript JSX | 80 | 2,62 | UI-компонент: хлебные крошки |
| src/components/ui/button.tsx | TypeScript JSX | 46 | 2,27 | UI-компонент: кнопка |
| src/components/ui/calendar.tsx | TypeScript JSX | 50 | 2,50 | UI-компонент: календарь |
| src/components/ui/card.tsx | TypeScript JSX | 35 | 1,74 | UI-компонент: карточка |
| src/components/ui/carousel.tsx | TypeScript JSX | 195 | 6,10 | UI-компонент: карусель |
| src/components/ui/chart.tsx | TypeScript JSX | 266 | 9,75 | UI-компонент: обёртка для графиков (Recharts) |
| src/components/ui/checkbox.tsx | TypeScript JSX | 23 | 1,03 | UI-компонент: чекбокс |
| src/components/ui/collapsible.tsx | TypeScript JSX | 5 | 0,31 | UI-компонент: сворачиваемый блок |
| src/components/ui/command.tsx | TypeScript JSX | 115 | 4,71 | UI-компонент: командная панель |
| src/components/ui/context-menu.tsx | TypeScript JSX | 161 | 7,02 | UI-компонент: контекстное меню |
| src/components/ui/dialog.tsx | TypeScript JSX | 83 | 3,67 | UI-компонент: модальное окно (диалог) |
| src/components/ui/drawer.tsx | TypeScript JSX | 75 | 2,87 | UI-компонент: выдвижная панель |
| src/components/ui/dropdown-menu.tsx | TypeScript JSX | 162 | 7,09 | UI-компонент: выпадающее меню |
| src/components/ui/form.tsx | TypeScript JSX | 105 | 3,92 | UI-компонент: форма (интеграция с react-hook-form) |
| src/components/ui/hover-card.tsx | TypeScript JSX | 22 | 1,16 | UI-компонент: всплывающая карточка при наведении |
| src/components/ui/input-otp.tsx | TypeScript JSX | 54 | 2,11 | UI-компонент: поле ввода OTP-кода |
| src/components/ui/input.tsx | TypeScript JSX | 19 | 0,78 | UI-компонент: поле ввода |
| src/components/ui/label.tsx | TypeScript JSX | 13 | 0,68 | UI-компонент: подпись к полю |
| src/components/ui/menubar.tsx | TypeScript JSX | 189 | 7,68 | UI-компонент: меню-бар |
| src/components/ui/navigation-menu.tsx | TypeScript JSX | 109 | 4,91 | UI-компонент: навигационное меню |
| src/components/ui/pagination.tsx | TypeScript JSX | 71 | 2,62 | UI-компонент: пагинация |
| src/components/ui/popover.tsx | TypeScript JSX | 24 | 1,21 | UI-компонент: всплывающая панель |
| src/components/ui/progress.tsx | TypeScript JSX | 20 | 0,75 | UI-компонент: индикатор прогресса |
| src/components/ui/radio-group.tsx | TypeScript JSX | 32 | 1,41 | UI-компонент: группа радиокнопок |
| src/components/ui/resizable.tsx | TypeScript JSX | 32 | 1,66 | UI-компонент: изменяемый размер панелей |
| src/components/ui/scroll-area.tsx | TypeScript JSX | 34 | 1,57 | UI-компонент: область с прокруткой |
| src/components/ui/select.tsx | TypeScript JSX | 130 | 5,44 | UI-компонент: выпадающий список |
| src/components/ui/separator.tsx | TypeScript JSX | 17 | 0,68 | UI-компонент: разделитель |
| src/components/ui/sheet.tsx | TypeScript JSX | 93 | 4,10 | UI-компонент: боковая панель (sheet) |
| src/components/ui/sidebar.tsx | TypeScript JSX | 572 | 22,30 | UI-компонент: боковая панель навигации |
| src/components/ui/skeleton.tsx | TypeScript JSX | 5 | 0,23 | UI-компонент: скелетон загрузки |
| src/components/ui/slider.tsx | TypeScript JSX | 20 | 1,04 | UI-компонент: слайдер |
| src/components/ui/sonner.tsx | TypeScript JSX | 23 | 0,86 | UI-компонент: тосты (Sonner) |
| src/components/ui/switch.tsx | TypeScript JSX | 24 | 1,12 | UI-компонент: переключатель |
| src/components/ui/table.tsx | TypeScript JSX | 62 | 2,63 | UI-компонент: таблица |
| src/components/ui/tabs.tsx | TypeScript JSX | 47 | 1,85 | UI-компонент: вкладки |
| src/components/ui/textarea.tsx | TypeScript JSX | 17 | 0,73 | UI-компонент: многострочное поле ввода |
| src/components/ui/toast.tsx | TypeScript JSX | 99 | 4,69 | UI-компонент: тост (уведомление) |
| src/components/ui/toaster.tsx | TypeScript JSX | 22 | 0,71 | UI-компонент: контейнер тостов |
| src/components/ui/toggle-group.tsx | TypeScript JSX | 41 | 1,67 | UI-компонент: группа переключателей |
| src/components/ui/toggle.tsx | TypeScript JSX | 32 | 1,38 | UI-компонент: переключатель-кнопка |
| src/components/ui/tooltip.tsx | TypeScript JSX | 22 | 1,13 | UI-компонент: подсказка при наведении |
| src/components/ui/use-toast.ts | TypeScript | 2 | 0,08 | Реэкспорт хука use-toast из hooks |
| src/hooks/use-mobile.tsx | TypeScript JSX | 15 | 0,56 | Хук: определение мобильного вида (адаптивность) |
| src/hooks/use-toast.ts | TypeScript | 154 | 3,84 | Хук: состояние и API тостов (показ, скрытие, очередь) |
| src/index.css | CSS | 199 | 5,61 | Глобальные стили, переменные темы, Tailwind |
| src/lib/pdfExport.ts | TypeScript | 339 | 15,64 | Утилиты экспорта в PDF (опции, формирование документа) |
| src/lib/piston.ts | TypeScript | 69 | 1,67 | Клиент Piston API: выполнение кода (язык, код, stdin → stdout/stderr) |
| src/lib/supabaseClient.ts | TypeScript | 9 | 0,44 | Создание и экспорт клиента Supabase (URL, anon key) |
| src/lib/utils.ts | TypeScript | 5 | 0,17 | Утилита cn: объединение CSS-классов (clsx + tailwind-merge) |
| src/main.tsx | TypeScript JSX | 4 | 0,16 | Точка входа: монтирование App в DOM, подключение index.css |
| src/pages/Auth.tsx | TypeScript JSX | 484 | 18,29 | Страница аутентификации: вкладки «Вход» и «Регистрация», валидация, вызовы Supabase Auth и RPC |
| src/pages/Index.tsx | TypeScript JSX | 19 | 0,50 | Лендинг: главная страница (Header, Hero, LanguageCards, Features, Footer) |
| src/pages/NotFound.tsx | TypeScript JSX | 20 | 0,71 | Страница 404 (не найден маршрут) |
| src/pages/admin/AdminDashboard.tsx | TypeScript JSX | 600 | 24,58 | Панель администратора: статистика (пользователи, уроки, лекции, достижения, активность, рейтинг), экспорт PDF |
| src/pages/admin/AdminLayout.tsx | TypeScript JSX | 131 | 5,22 | Макет панели администратора: шапка, бургер-меню, навигация, выход |
| src/pages/app/Achievements.tsx | TypeScript JSX | 109 | 4,39 | Страница достижений: список достижений, статус «получено» / «не получено» |
| src/pages/app/AppLayout.tsx | TypeScript JSX | 221 | 9,04 | Макет приложения: шапка, навигация (Уроки, Лекции, Профиль, Достижения), меню пользователя, выход |
| src/pages/app/Dashboard.tsx | TypeScript JSX | 413 | 16,92 | Дашборд пользователя: XP, уровень, серия, прогресс, лидерборд, сводная статистика |
| src/pages/app/LectureDetail.tsx | TypeScript JSX | 128 | 4,63 | Страница лекции: разделы (Markdown), кнопка «Завершить лекцию» |
| src/pages/app/Lectures.tsx | TypeScript JSX | 129 | 5,31 | Список лекций по всем языкам |
| src/pages/app/LecturesLanguage.tsx | TypeScript JSX | 164 | 6,99 | Список лекций по выбранному языку |
| src/pages/app/LessonDetail.tsx | TypeScript JSX | 673 | 26,73 | Страница урока: условие (Markdown), редактор кода (CodeMirror), запуск тестов (Piston), результаты, завершение урока |
| src/pages/app/Lessons.tsx | TypeScript JSX | 201 | 7,51 | Список уроков по всем языкам |
| src/pages/app/LessonsLanguage.tsx | TypeScript JSX | 266 | 10,45 | Список уроков по выбранному языку |
| src/pages/app/Profile.backup.tsx | TypeScript JSX | 411 | 15,51 | Резервная копия компонента профиля |
| src/pages/app/Profile.tsx | TypeScript JSX | 811 | 35,06 | Профиль пользователя: просмотр/редактирование данных, аватар, смена пароля, статистика по языкам (XP, уроки, лекции, отправки) |
| src/pages/auth/AuthLayout.tsx | TypeScript JSX | 16 | 0,49 | Макет страницы аутентификации (обёртка для вкладок) |
| src/pages/auth/Login.tsx | TypeScript JSX | 94 | 3,60 | Форма входа (логин, пароль) — альтернативная/запасная |
| src/pages/auth/Register.tsx | TypeScript JSX | 111 | 4,29 | Форма регистрации (Zod) — альтернативная/запасная |
| src/pages/mentor/MentorDashboard.tsx | TypeScript JSX | 1625 | 65,00 | Панель ментора: CRUD уроков и лекций, редакторы заданий и подсказок, разделов лекций, поиск и сортировка |
| src/pages/mentor/MentorLayout.tsx | TypeScript JSX | 134 | 5,38 | Макет панели ментора: шапка, бургер-меню, навигация, выход |
| src/test/example.test.ts | TypeScript | 6 | 0,14 | Пример модульного теста (Vitest) |
| src/test/setup.ts | TypeScript | 14 | 0,34 | Настройка окружения для тестов (jsdom и др.) |
| src/vite-env.d.ts | TypeScript | 7 | 0,20 | Объявление типов для Vite (ImportMeta.env) |

**Итого по каталогу src:** 93 файла, 12 064 строк кода.

Вес указан в килобайтах (КБ); разделитель дробной части — запятая.
