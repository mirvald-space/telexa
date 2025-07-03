# Автоматический деплой Supabase Edge Functions

Этот проект настроен для автоматического деплоя Supabase Edge Functions при деплое на Vercel.

## Edge Functions в проекте

В проекте используются следующие edge-функции:

1. **send-telegram-message** - отправляет запланированные посты в Telegram
2. **scheduler** - периодически вызывает функцию send-telegram-message для проверки и отправки постов

### Запуск scheduler

После деплоя вам нужно запустить функцию scheduler, чтобы она начала периодически проверять и отправлять запланированные посты:

```bash
curl -X POST https://bqysahcurgznnigptlqf.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"interval": 60}'
```

Где:
- `YOUR_SERVICE_ROLE_KEY` - ваш service role key
- `interval` - интервал проверки в секундах (по умолчанию 60 секунд)

## Настройка в Vercel

1. В панели управления Vercel для вашего проекта перейдите в раздел "Settings" > "Environment Variables"
2. Добавьте следующие переменные окружения:
   - `SUPABASE_ACCESS_TOKEN` - токен доступа к Supabase (получите его в [настройках аккаунта Supabase](https://app.supabase.com/account/tokens))
   - `SERVICE_ROLE_KEY` - service role key вашего проекта Supabase (из раздела Settings > API в проекте Supabase)
   - `SUPABASE_URL` - URL вашего проекта Supabase (например, https://bqysahcurgznnigptlqf.supabase.co)
   - `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота

## Как это работает

1. При деплое на Vercel запускается скрипт сборки `npm run build`
2. После сборки фронтенда запускается скрипт `deploy-functions.js`
3. Скрипт аутентифицируется в Supabase CLI с помощью `SUPABASE_ACCESS_TOKEN`
4. Затем скрипт деплоит edge-функции в ваш проект Supabase

## Локальное тестирование

Для локального тестирования деплоя функций:

1. Войдите в Supabase CLI: `npx supabase login`
2. Запустите деплой функций: `npm run deploy:functions:local`

## Добавление новых функций

Если вы добавляете новые edge-функции, обновите файл `deploy-functions.js`, добавив новые команды деплоя:

```javascript
// Деплоим функции
console.log('Deploying send-telegram-message function...');
runCommand('npx supabase functions deploy send-telegram-message --project-ref bqysahcurgznnigptlqf');

// Добавьте новые функции здесь
console.log('Deploying new-function function...');
runCommand('npx supabase functions deploy new-function --project-ref bqysahcurgznnigptlqf');
``` 