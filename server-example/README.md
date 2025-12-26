# LiveTalk Server

Сервер для мессенджера LiveTalk.

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск локально

```bash
npm start
```

Сервер запустится на `http://localhost:3000`

### 3. Деплой на Fly.io (РЕКОМЕНДУЕТСЯ - Без отключений!)

**Плюсы:** Полностью бесплатно, НЕ отключается, WebSocket

1. Установите Fly CLI:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Войдите в аккаунт:
   ```bash
   fly auth signup
   ```

3. В папке проекта:
   ```bash
   fly launch
   ```

4. Следуйте инструкциям

После деплоя получите URL вида: `https://livetalk-server.fly.dev`

### 4. Деплой на Cyclic.sh (Без отключений!)

**Плюсы:** Полностью бесплатно, НЕ отключается, автодеплой

1. Создайте репозиторий на GitHub с этим кодом
2. Зайдите на https://cyclic.sh
3. Нажмите "Deploy Now"
4. Подключите GitHub и выберите репозиторий
5. Cyclic автоматически задеплоит

URL будет вида: `https://your-app.cyclic.app`

### 5. Деплой на Koyeb (Без отключений!)

**Плюсы:** Бесплатный tier, НЕ отключается

1. Зайдите на https://www.koyeb.com
2. "Create App" → "GitHub"
3. Выберите репозиторий
4. Koyeb автоматически задеплоит

### 6. Деплой на Render.com (НЕ рекомендуется - отключается)

1. Создайте аккаунт на https://render.com
2. Нажмите "New" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Укажите:
   - **Name**: livetalk-server
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Нажмите "Create Web Service"

После деплоя вы получите URL вида: `https://livetalk-server.onrender.com`

### 4. Деплой на Railway.app

1. Создайте аккаунт на https://railway.app
2. Нажмите "New Project" → "Deploy from GitHub repo"
3. Выберите репозиторий
4. Railway автоматически определит Node.js проект
5. Деплой произойдет автоматически

### 5. Деплой на Fly.io

1. Установите Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. Создайте аккаунт: `fly auth signup`
3. В папке проекта: `fly launch`
4. Следуйте инструкциям

### 6. Деплой на Glitch.com

1. Зайдите на https://glitch.com
2. Нажмите "New Project" → "Import from GitHub"
3. Укажите URL вашего репозитория
4. Glitch автоматически запустит сервер

## Настройка в LiveTalk

После деплоя:

1. Откройте LiveTalk
2. Настройки → Дополнительно
3. Выберите "Серверный" режим
4. Введите URL вашего сервера (например: `https://livetalk-server.onrender.com`)
5. Перезапустите приложение

## Важно для продакшена

⚠️ **Этот пример использует хранение в памяти!** При перезапуске сервера все данные потеряются.

Для продакшена добавьте:
- Базу данных (MongoDB, PostgreSQL, SQLite)
- Хеширование паролей (bcrypt)
- JWT токены для аутентификации
- Валидацию данных
- Rate limiting
- HTTPS только

## Улучшенная версия с базой данных

Для продакшена рекомендую использовать:
- **MongoDB Atlas** (бесплатный tier) - https://www.mongodb.com/cloud/atlas
- **Supabase** (бесплатный PostgreSQL) - https://supabase.com
- **PlanetScale** (бесплатный MySQL) - https://planetscale.com

## Переменные окружения

Создайте файл `.env`:

```
PORT=3000
NODE_ENV=production
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

## Структура API

См. `API_DOCUMENTATION.md` в корне проекта LiveTalk.

