# Инструкция по развертыванию на Railway

## Шаг 1: Подготовка Instagram/Meta App

### 1.1 Создание Meta App

1. Перейдите на [Meta for Developers](https://developers.facebook.com/)
2. Создайте новое приложение (тип: "Business")
3. Добавьте продукт "Instagram" в ваше приложение
4. Перейдите в настройки Instagram → Basic

### 1.2 Настройка Instagram Business Account

1. Убедитесь, что ваш Instagram аккаунт:
   - Является Business или Creator аккаунтом
   - Связан с Facebook Page
   - Имеет включенные Direct Messages

2. В настройках Instagram → Basic:
   - Добавьте вашу Facebook Page
   - Сохраните Instagram App ID и Instagram App Secret

### 1.3 Получение Page Access Token

1. Перейдите в Tools → Graph API Explorer
2. Выберите ваше приложение и Facebook Page
3. Добавьте следующие permissions:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_read_engagement`
   - `pages_manage_metadata`
4. Нажмите "Generate Access Token"
5. **ВАЖНО**: Сгенерируйте долгосрочный токен:
   - Перейдите в Tools → Access Token Tool
   - Выберите вашу страницу
   - Нажмите "Extend Access Token" (если доступно)
   - Или используйте Graph API для получения долгосрочного токена

### 1.4 Настройка Webhook (после деплоя на Railway)

После того как Railway развернет ваше приложение и выдаст URL:

1. Перейдите в Instagram → Webhooks
2. Добавьте новый webhook:
   - **Callback URL**: `https://your-railway-app.up.railway.app/webhook/instagram`
   - **Verify Token**: Придумайте случайную строку (например, используйте генератор)
   - **Subscription Fields**: Выберите `messages`
3. Сохраните Verify Token - он понадобится для переменных окружения

## Шаг 2: Настройка OpenAI

1. Перейдите на [OpenAI Platform](https://platform.openai.com/)
2. Создайте API ключ в разделе API Keys
3. Сохраните ключ - он понадобится для Railway
4. Рекомендуется использовать модель `gpt-4` для лучшего качества, но можно использовать `gpt-3.5-turbo` для экономии

## Шаг 3: Развертывание на Railway

### 3.1 Создание проекта на Railway

1. Перейдите на [Railway](https://railway.app/)
2. Войдите через GitHub
3. Нажмите "New Project"
4. Выберите "Deploy from GitHub repo"
5. Выберите репозиторий `elemental-agent-egor-adamovich`
6. Railway автоматически определит проект и начнет деплой

### 3.2 Добавление PostgreSQL

1. В вашем Railway проекте нажмите "+ New"
2. Выберите "Database" → "Add PostgreSQL"
3. Railway автоматически создаст базу данных
4. После создания, Railway покажет переменную `DATABASE_URL` - она будет автоматически добавлена в переменные окружения

### 3.3 Настройка переменных окружения

В настройках вашего сервиса (Settings → Variables) добавьте:

```env
# Server (опционально, Railway установит автоматически)
PORT=3000
NODE_ENV=production

# Database (Railway добавит автоматически из PostgreSQL сервиса)
# DATABASE_URL будет добавлен автоматически

# Instagram/Meta
INSTAGRAM_PAGE_ACCESS_TOKEN=ваш_page_access_token_здесь
INSTAGRAM_VERIFY_TOKEN=ваш_verify_token_здесь
INSTAGRAM_WEBHOOK_SECRET=опционально_для_дополнительной_безопасности

# OpenAI
OPENAI_API_KEY=ваш_openai_api_key_здесь
OPENAI_MODEL=gpt-4
```

### 3.4 Запуск миграций базы данных

После первого деплоя:

1. В Railway откройте ваш сервис
2. Перейдите в раздел "Deployments"
3. Откройте последний деплой
4. Нажмите на три точки → "Open in Terminal"
5. Выполните команды:

```bash
npx prisma generate
npx prisma migrate deploy
```

Или добавьте эти команды в `package.json` как postinstall скрипт (Railway выполнит их автоматически).

### 3.5 Получение публичного URL

1. В настройках вашего сервиса найдите раздел "Networking"
2. Нажмите "Generate Domain" или используйте существующий
3. Скопируйте URL (например: `https://your-app.up.railway.app`)

## Шаг 4: Завершение настройки Webhook

1. Вернитесь в Meta Developers Console → Instagram → Webhooks
2. Обновите Callback URL на ваш Railway URL: `https://your-app.up.railway.app/webhook/instagram`
3. Убедитесь, что Verify Token совпадает с `INSTAGRAM_VERIFY_TOKEN` в Railway
4. Нажмите "Verify and Save"
5. После успешной верификации, включите webhook (переключите тумблер)

## Шаг 5: Тестирование

1. Откройте Instagram и отправьте сообщение вашему бизнес-аккаунту
2. Проверьте логи в Railway (Deployments → View Logs)
3. Убедитесь, что:
   - Сообщения получаются
   - Ответы отправляются
   - Записи сохраняются в базе данных

## Шаг 6: Мониторинг и обслуживание

### Просмотр логов

- В Railway: Deployments → View Logs
- Или используйте Railway CLI: `railway logs`

### Просмотр записей на консультацию

Используйте Prisma Studio:

```bash
railway run npx prisma studio
```

Или подключитесь к базе данных напрямую через Railway dashboard.

### Обновление кода

1. Сделайте изменения в коде
2. Закоммитьте и запушьте в GitHub
3. Railway автоматически задеплоит новую версию

## Возможные проблемы и решения

### Проблема: Webhook не верифицируется

**Решение:**
- Убедитесь, что URL доступен публично (Railway должен выдать публичный домен)
- Проверьте, что `INSTAGRAM_VERIFY_TOKEN` совпадает в Railway и Meta Console
- Проверьте логи Railway на наличие ошибок

### Проблема: Сообщения не приходят

**Решение:**
- Убедитесь, что webhook включен в Meta Console
- Проверьте, что Instagram аккаунт связан с Facebook Page
- Проверьте права доступа Page Access Token
- Убедитесь, что бот подписан на событие `messages`

### Проблема: Ошибки базы данных

**Решение:**
- Убедитесь, что миграции выполнены: `npx prisma migrate deploy`
- Проверьте `DATABASE_URL` в переменных окружения
- Проверьте подключение к базе данных через Railway dashboard

### Проблема: OpenAI ошибки

**Решение:**
- Проверьте баланс OpenAI аккаунта
- Убедитесь, что API ключ правильный
- Проверьте лимиты использования API

## Дополнительные настройки

### Использование кастомного домена

1. В Railway → Settings → Networking
2. Добавьте ваш домен
3. Настройте DNS записи согласно инструкциям Railway
4. Обновите Callback URL в Meta Console

### Настройка автоматических миграций

Добавьте в `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "railway": "prisma migrate deploy && npm start"
  }
}
```

И измените start command в Railway на: `npm run railway`

## Безопасность

- Никогда не коммитьте `.env` файл
- Используйте сильные Verify Tokens
- Регулярно обновляйте зависимости: `npm audit` и `npm update`
- Мониторьте использование API для предотвращения превышения лимитов


