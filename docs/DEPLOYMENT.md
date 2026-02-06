# Деплой SnowForce Dispatch

## Требования

- Node.js 18+
- npm 9+
- Docker (опционально)

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Приложение доступно на http://localhost:3000
```

## Production сборка

```bash
# Сборка с проверкой типов
npm run build

# Предпросмотр сборки
npm run preview
```

Результат сборки находится в папке `dist/`.

## GitHub Pages

### Настройка

1. В `vite.config.ts` установите base path:

```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ...
});
```

2. Настройте GitHub Actions (см. `.github/workflows/ci.yml`).

3. В настройках репозитория → Pages → Source: GitHub Actions.

### Ручной деплой

```bash
npm run build
# Загрузите содержимое dist/ в ветку gh-pages
```

## Docker

### Сборка образа

```bash
docker build -t snowforce .
```

### Запуск контейнера

```bash
docker run -p 80:80 snowforce
```

### Docker Compose

```bash
docker-compose up -d
```

Приложение будет доступно на http://localhost.

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## VPS / Dedicated Server

### 1. Установка Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Сборка приложения

```bash
git clone <repository>
cd snowforce-dispatch
npm install
npm run build
```

### 3. Настройка Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/snowforce/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### 4. SSL с Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `VITE_GEMINI_API_KEY` | API ключ Google Gemini | - |
| `VITE_BASE_URL` | Базовый путь | `/` |
| `VITE_APP_ENV` | Окружение | `development` |

### Создание .env файла

```bash
cp .env.example .env
# Отредактируйте .env с вашими значениями
```

## CI/CD с GitHub Actions

### Автоматическая сборка

При каждом push в `main`/`master` запускается:
1. Проверка типов (TypeScript)
2. Линтинг (ESLint)
3. Тесты (Vitest)
4. Сборка production

### Файл workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build
```

## Мониторинг и логирование

### Рекомендации

1. **Error tracking**: Sentry, Rollbar
2. **Analytics**: Google Analytics, Yandex.Metrika
3. **Performance**: Lighthouse CI

### Пример интеграции Sentry

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: import.meta.env.VITE_APP_ENV,
});
```

## Troubleshooting

### Ошибка "Page not found" при обновлении

Убедитесь, что nginx настроен с `try_files`:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Проблемы с CORS

Для API запросов добавьте в nginx:

```nginx
add_header Access-Control-Allow-Origin *;
```

### Большой размер бандла

Проверьте сборку:

```bash
npm run build
# Анализ размера
npx vite-bundle-visualizer
```
