import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';

// Константы
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bqysahcurgznnigptlqf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

// Функция для обработки массива изображений
function parseImageUrls(imageUrls) {
  if (!imageUrls) return [];
  
  if (Array.isArray(imageUrls)) return imageUrls;
  
  if (typeof imageUrls === 'string') {
    try {
      return JSON.parse(imageUrls);
    } catch {
      // PostgreSQL array format {url1,url2}
      if (imageUrls.startsWith('{') && imageUrls.endsWith('}')) {
        return imageUrls.slice(1, -1).split(',').map(url => url.replace(/^"|"$/g, '').trim());
      }
    }
  }
  
  return [];
}

export default async function handler(req, res) {
  // Проверка авторизации с CRON_SECRET
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  
  // Проверяем авторизацию через заголовок Authorization или параметр token
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const isAuthorized = CRON_SECRET && (headerToken === CRON_SECRET || queryToken === CRON_SECRET);
  
  if (!isAuthorized) {
    console.log('Unauthorized request - missing or invalid CRON_SECRET');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Проверка необходимых переменных окружения
    if (!SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'SERVICE_ROLE_KEY not configured' });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }

    // Инициализация Supabase клиента с сервисным ключом
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Инициализация Telegram бота
    const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

    // Получаем все запланированные посты, время которых уже наступило
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', new Date().toISOString());
    
    if (error) {
      console.error('Ошибка при получении постов:', error);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }
    
    console.log(`Найдено ${posts?.length || 0} постов для отправки`);
    
    if (!posts || posts.length === 0) {
      return res.status(200).json({ message: 'No posts to send', count: 0 });
    }
    
    const results = [];
    
    // Обрабатываем каждый пост
    for (const post of posts) {
      try {
        if (!post.chat_ids || post.chat_ids.length === 0) {
          console.error(`Пост ${post.id} не имеет chat_ids`);
          await supabase
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id);
          
          results.push({ id: post.id, status: 'failed', error: 'No chat IDs specified' });
          continue;
        }
        
        // Преобразуем переносы строк в HTML
        const content = post.content.replace(/\\n/g, '<br>');
        
        // Получаем URL изображений
        const imageUrls = post.image_urls 
          ? parseImageUrls(post.image_urls) 
          : (post.image_url ? [post.image_url] : []);
        
        // Отправляем сообщение в каждый чат
        for (const chatId of post.chat_ids) {
          if (imageUrls.length === 0) {
            // Отправка только текста
            await bot.telegram.sendMessage(chatId, content, { parse_mode: 'HTML' });
          } else if (imageUrls.length === 1) {
            // Отправка одного изображения с подписью
            await bot.telegram.sendPhoto(chatId, imageUrls[0], {
              caption: content,
              parse_mode: 'HTML'
            });
          } else {
            // Отправка группы изображений
            const media = imageUrls.map((url, index) => ({
              type: 'photo',
              media: url,
              ...(index === 0 ? { caption: content, parse_mode: 'HTML' } : {})
            }));
            
            await bot.telegram.sendMediaGroup(chatId, media);
          }
        }
        
        // Обновляем статус поста
        await supabase
          .from('posts')
          .update({ status: 'sent' })
          .eq('id', post.id);
        
        results.push({ id: post.id, status: 'sent' });
        console.log(`Пост ${post.id} успешно отправлен`);
      } catch (error) {
        console.error(`Ошибка при отправке поста ${post.id}:`, error);
        
        await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('id', post.id);
        
        results.push({ id: post.id, status: 'failed', error: error.message });
      }
    }
    
    return res.status(200).json({ 
      message: 'Posts processed',
      count: posts.length,
      results
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 