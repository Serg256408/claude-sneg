# SnowForce Dispatch - Система управления заказами

Веб-приложение для управления заказами на вывоз снега и благоустройство территорий.

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- npm 9+

### Установка

```bash
npm install
npm run dev
```

### Сборка для production

```bash
npm run build
npm run preview
```

## 📱 Роли пользователей

| Роль | Описание | Портал |
|------|----------|--------|
| Клиент | Создание заказов, просмотр статуса | CustomerPortal |
| Менеджер | Управление лидами | SalesManagerPortal |
| Сметчик | Расчёт стоимости | EstimatorPortal |
| Диспетчер | Координация работ | OrderForm + MapDashboard |
| Подрядчик | Отклики на заказы, управление техникой | ContractorPortal |
| Водитель | Выполнение рейсов, фотоотчёты | DriverPortal |
| Бухгалтер | Счета, оплаты, документы | AccountantPortal |
| Админ | Справочники, пользователи | AdminPanel |

## 🏗️ Структура проекта

```
├── App.tsx              # Главный компонент, роутинг
├── types.ts             # Все типы и интерфейсы
├── CustomerPortal.tsx   # Портал клиента
├── ContractorPortal.tsx # Портал подрядчика
├── DriverPortal.tsx     # Портал водителя
├── OrderForm.tsx        # Форма заказа (диспетчер)
├── AdminPanel.tsx       # Админ-панель
├── AccountantPortal.tsx # Портал бухгалтера
├── SalesManagerPortal.tsx # Портал менеджера
├── EstimatorPortal.tsx  # Портал сметчика
├── MapDashboard.tsx     # Карта диспетчера
├── ConfirmModal.tsx     # Модалка подтверждения
├── index.html           # HTML entry point
├── index.tsx            # React entry point
├── vite.config.ts       # Конфигурация Vite
├── tsconfig.json        # Конфигурация TypeScript
└── docs/                # Документация
    ├── ARCHITECTURE.md  # Архитектура приложения
    ├── API.md           # Типы и интерфейсы
    └── DEPLOYMENT.md    # Инструкции деплоя
```

## 💾 Хранение данных

Данные хранятся в localStorage с версионированием:

| Ключ | Описание |
|------|----------|
| `snowforce_orders_v1` | Заказы |
| `snowforce_customers_v1` | Клиенты |
| `snowforce_contractors_v1` | Подрядчики |
| `snowforce_leads_v1` | Лиды |
| `snowforce_users_v1` | Пользователи |
| `snowforce_company_settings_v1` | Реквизиты компании |
| `snowforce_vehicles_v1` | Техника |
| `snowforce_pricebook_v1` | Прайс-лист |

## 🔧 Скрипты

```bash
npm run dev          # Запуск dev-сервера
npm run build        # Сборка production
npm run preview      # Предпросмотр сборки
npm run type-check   # Проверка типов TypeScript
npm run lint         # Проверка ESLint
npm run lint:fix     # Авто-исправление ESLint
npm run format       # Форматирование Prettier
npm run format:check # Проверка форматирования
npm run test         # Запуск тестов (watch mode)
npm run test:run     # Запуск тестов (однократно)
npm run test:coverage # Тесты с покрытием
npm run ci           # Полная проверка для CI
```

## 🔑 Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```env
VITE_GEMINI_API_KEY=your_api_key  # API ключ Google Gemini
VITE_BASE_URL=/                    # Базовый путь
VITE_APP_ENV=development           # Окружение
```

## 🐳 Docker

```bash
# Сборка образа
docker build -t snowforce .

# Запуск
docker run -p 80:80 snowforce

# С docker-compose
docker-compose up -d
```

## 📖 Документация

- [Архитектура](docs/ARCHITECTURE.md) - Структура и потоки данных
- [API Reference](docs/API.md) - Типы и интерфейсы
- [Деплой](docs/DEPLOYMENT.md) - Инструкции по развёртыванию

## 🛠️ Технологии

- **React 19** - UI библиотека
- **TypeScript** - Типизация
- **Vite** - Сборщик
- **Tailwind CSS** - Стилизация
- **pdfmake** - Генерация PDF
- **Google Gemini AI** - Анализ адресов

## 📝 Лицензия

Proprietary. All rights reserved.
