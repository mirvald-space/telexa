import { createClient } from '@supabase/supabase-js';
import pkg from 'telegraf';
const { Telegraf } = pkg;
import fetch from 'node-fetch';

// Константы
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bqysahcurgznnigptlqf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB - максимальный размер для Telegram
const MAX_TELEGRAM_SIZE = 20 * 1024 * 1024; // 20MB - абсолютный максимум для Telegram

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

// Функция для загрузки изображения по URL
async function downloadImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки изображения: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();
    
    return { buffer, mimeType: contentType };
  } catch (error) {
    console.error(`Ошибка при загрузке изображения с URL ${url}:`, error);
    throw error;
  }
}

// Функция для уменьшения размера изображения
async function resizeImage(buffer, mimeType) {
  // Если изображение меньше максимального размера, возвращаем как есть
  if (buffer.length <= MAX_IMAGE_SIZE_BYTES) {
    return { buffer, mimeType };
  }
  
  console.log(`Изображение слишком большое (${buffer.length} байт), конвертируем в JPEG с пониженным качеством`);
  
  try {
    // Импортируем sharp только если нужно (динамический импорт)
    const sharp = await import('sharp');
    
    // Преобразуем в JPEG с пониженным качеством
    const resizedBuffer = await sharp.default(buffer)
      .jpeg({ quality: 70 }) // Уменьшаем качество
      .resize({ width: 1280, height: 1280, fit: 'inside' }) // Уменьшаем размеры, если нужно
      .toBuffer();
    
    console.log(`Изображение уменьшено до ${resizedBuffer.length} байт`);
    return { buffer: resizedBuffer, mimeType: 'image/jpeg' };
  } catch (error) {
    console.error('Ошибка при изменении размера изображения:', error);
    // В случае ошибки возвращаем оригинальное изображение
    return { buffer, mimeType };
  }
}

// Функция для проверки и обработки base64 изображений
async function processImageUrl(url) {
  // Проверяем, является ли URL base64 строкой
  if (typeof url === 'string' && url.startsWith('data:image/')) {
    try {
      // Извлекаем MIME тип и данные
      const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Создаем Buffer из base64 данных
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Изменяем размер изображения, если оно слишком большое
        const { buffer: resizedBuffer, mimeType: newMimeType } = await resizeImage(buffer, mimeType);
        
        // Определяем расширение файла на основе MIME типа
        const extension = newMimeType.split('/')[1] || 'png';
        
        // Возвращаем объект для Telegraf
        return {
          isBase64: true,
          buffer: resizedBuffer,
          filename: `image.${extension}`,
          originalSize: buffer.length,
          resizedSize: resizedBuffer.length
        };
      }
    } catch (error) {
      console.error('Ошибка при обработке base64 изображения:', error);
    }
  } else if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    // Обрабатываем URL изображения
    try {
      // Загружаем изображение
      const { buffer, mimeType } = await downloadImage(url);
      
      // Проверяем размер и при необходимости изменяем
      const { buffer: resizedBuffer, mimeType: newMimeType } = await resizeImage(buffer, mimeType);
      
      // Если размер изображения был изменен, отправляем как файл
      if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        const extension = newMimeType.split('/')[1] || 'jpg';
        return {
          isBase64: true,
          buffer: resizedBuffer,
          filename: `image.${extension}`,
          originalSize: buffer.length,
          resizedSize: resizedBuffer.length
        };
      }
    } catch (error) {
      console.error(`Ошибка при обработке URL изображения ${url}:`, error);
      // В случае ошибки, продолжаем с исходным URL
    }
  }
  
  // Если это не base64 или произошла ошибка, возвращаем исходный URL
  return { isBase64: false, url };
}

// Функция для безопасной отправки сообщения с изображением
async function safelySendPhoto(bot, chatId, imageData, options = {}) {
  try {
    if (imageData.isBase64) {
      // Проверяем, не слишком ли большое изображение даже после сжатия
      if (imageData.resizedSize > MAX_TELEGRAM_SIZE) {
        console.log(`Изображение слишком большое даже после сжатия (${imageData.resizedSize} байт), отправляем только текст`);
        // Отправляем только текст
        await bot.telegram.sendMessage(chatId, options.caption || 'Изображение слишком большое для отправки', { 
          parse_mode: options.parse_mode 
        });
        return;
      }
      
      // Отправляем изображение
      await bot.telegram.sendPhoto(
        chatId, 
        { source: imageData.buffer, filename: imageData.filename }, 
        options
      );
    } else {
      // Отправляем по URL
      await bot.telegram.sendPhoto(chatId, imageData.url, options);
    }
  } catch (error) {
    console.error(`Ошибка при отправке изображения в чат ${chatId}:`, error);
    
    // Если ошибка связана с размером, отправляем только текст
    if (error.response && error.response.error_code === 413) {
      console.log('Получена ошибка 413: Request Entity Too Large, отправляем только текст');
      await bot.telegram.sendMessage(chatId, options.caption || 'Не удалось отправить изображение (слишком большое)', { 
        parse_mode: options.parse_mode 
      });
    } else {
      // Другие ошибки пробрасываем дальше
      throw error;
    }
  }
}

// Функция для безопасной отправки группы медиа
async function safelySendMediaGroup(bot, chatId, media) {
  try {
    await bot.telegram.sendMediaGroup(chatId, media);
  } catch (error) {
    console.error(`Ошибка при отправке группы изображений в чат ${chatId}:`, error);
    
    // Если ошибка связана с размером, пробуем отправить по одному
    if (error.response && error.response.error_code === 413) {
      console.log('Получена ошибка 413: Request Entity Too Large, отправляем изображения по одному');
      
      // Сначала отправляем текст, если он есть
      const firstItem = media.find(item => item.caption);
      if (firstItem && firstItem.caption) {
        await bot.telegram.sendMessage(chatId, firstItem.caption, { 
          parse_mode: firstItem.parse_mode 
        });
      }
      
      // Затем отправляем каждое изображение отдельно без подписи
      for (const item of media) {
        try {
          if (typeof item.media === 'object' && item.media.source) {
            // Это буфер
            await bot.telegram.sendPhoto(chatId, { 
              source: item.media.source, 
              filename: item.media.filename 
            });
          } else {
            // Это URL
            await bot.telegram.sendPhoto(chatId, item.media);
          }
        } catch (photoError) {
          console.error(`Не удалось отправить отдельное изображение:`, photoError);
          // Продолжаем с другими изображениями
        }
      }
    } else {
      // Другие ошибки пробрасываем дальше
      throw error;
    }
  }
}

export default async function handler(req, res) {
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
            // Обрабатываем изображение (проверяем, не base64 ли это)
            const processedImage = await processImageUrl(imageUrls[0]);
            
            // Отправка одного изображения с подписью
            await safelySendPhoto(bot, chatId, processedImage, {
              caption: content,
              parse_mode: 'HTML'
            });
          } else {
            // Отправка группы изображений
            const media = await Promise.all(imageUrls.map(async (url, index) => {
              const processedImage = await processImageUrl(url);
              
              if (processedImage.isBase64) {
                return {
                  type: 'photo',
                  media: { source: processedImage.buffer, filename: processedImage.filename },
                  ...(index === 0 ? { caption: content, parse_mode: 'HTML' } : {})
                };
              } else {
                return {
                  type: 'photo',
                  media: processedImage.url,
                  ...(index === 0 ? { caption: content, parse_mode: 'HTML' } : {})
                };
              }
            }));
            
            await safelySendMediaGroup(bot, chatId, media);
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