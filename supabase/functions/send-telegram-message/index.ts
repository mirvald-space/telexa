import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get bot token from environment variables
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set in environment variables')
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get all scheduled posts that should be sent now (scheduled_time <= now)
    const now = new Date()
    const nowISO = now.toISOString()

    console.log('Checking for posts scheduled at or before:', nowISO)

    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', nowISO)

    if (fetchError) {
      console.error('Error fetching posts:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Found posts to send:', posts?.length || 0)

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: 'No posts to send', results: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    // Send each post
    for (const post of posts) {
      try {
        console.log('Processing post:', post.id, 'scheduled for:', post.scheduled_time)
        
        let telegramResponse
        // Use post-specific chat_id
        const chatId = post.chat_id

        if (!chatId) {
          console.error('No chat ID specified for post:', post.id)
          results.push({ 
            postId: post.id, 
            status: 'failed', 
            error: 'No chat ID specified' 
          })
          
          // Mark as failed
          await supabase
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id)
            
          continue
        }

        // Преобразуем переносы строк в теги <br>
        const contentWithLineBreaks = post.content.replace(/\n/g, '<br>')

        // Проверяем наличие изображений
        const hasLegacyImage = post.image_url && post.image_url.trim() !== '';
        const hasImages = Array.isArray(post.image_urls) && post.image_urls.length > 0;

        if (hasImages) {
          // Используем новое поле image_urls (массив)
          if (post.image_urls.length === 1) {
            // Если только одно изображение, используем sendPhoto
            const imageUrl = post.image_urls[0];
            
            // Проверяем, base64 это или URL
            if (imageUrl.startsWith('data:image/')) {
              console.log('Sending single base64 image for post:', post.id);
              
              // Обрабатываем base64 изображение
              const base64Data = imageUrl.split(',')[1];
              const mimeType = imageUrl.split(';')[0].split(':')[1];
              
              // Конвертируем base64 в Uint8Array
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Создаем FormData для загрузки фото
              const formData = new FormData();
              formData.append('chat_id', chatId);
              formData.append('caption', contentWithLineBreaks);
              formData.append('parse_mode', 'HTML');
              formData.append('photo', new Blob([bytes], { type: mimeType }), 'image.png');

              telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
              });
            } else {
              console.log('Sending single URL image for post:', post.id);
              
              // Обрабатываем обычный URL изображения
              const photoData = {
                chat_id: chatId,
                photo: imageUrl,
                caption: contentWithLineBreaks,
                parse_mode: 'HTML'
              };

              telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(photoData)
              });
            }
          } else {
            // Если несколько изображений, используем sendMediaGroup
            console.log('Sending multiple images as media group for post:', post.id);
            
            // Подготавливаем массив медиа-объектов
            const media = [];
            
            // Обрабатываем каждое изображение
            for (let i = 0; i < post.image_urls.length; i++) {
              const imageUrl = post.image_urls[i];
              
              if (imageUrl.startsWith('data:image/')) {
                // Для base64 изображений нам нужно сначала загрузить их на сервер Telegram
                const base64Data = imageUrl.split(',')[1];
                const mimeType = imageUrl.split(';')[0].split(':')[1];
                
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let j = 0; j < binaryString.length; j++) {
                  bytes[j] = binaryString.charCodeAt(j);
                }
                
                // Загружаем изображение на сервер Telegram с помощью sendPhoto
                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('photo', new Blob([bytes], { type: mimeType }), `image${i}.png`);
                // Не добавляем подпись, так как она будет добавлена в медиа-группе
                
                const uploadResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                  method: 'POST',
                  body: formData
                });
                
                const uploadResult = await uploadResponse.json();
                
                if (uploadResponse.ok && uploadResult.ok) {
                  // Получаем file_id из результата загрузки
                  // Берем самый большой размер фото (последний в массиве)
                  const photoSizes = uploadResult.result.photo;
                  const fileId = photoSizes[photoSizes.length - 1].file_id;
                  
                  // Добавляем загруженное изображение в медиа-группу
                  const mediaItem: any = {
                    type: 'photo',
                    media: fileId
                  };
                  
                  // Добавляем подпись только к первому изображению
                  if (i === 0) {
                    mediaItem.caption = contentWithLineBreaks;
                    mediaItem.parse_mode = 'HTML';
                  }
                  
                  media.push(mediaItem);
                  
                  // Удаляем отправленное сообщение, так как оно было нужно только для получения file_id
                  await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      message_id: uploadResult.result.message_id
                    })
                  });
                } else {
                  console.error('Failed to upload image:', uploadResult.description);
                }
              } else {
                // Для URL изображений просто добавляем их в медиа-группу
                const mediaItem: any = {
                  type: 'photo',
                  media: imageUrl
                };
                
                // Добавляем подпись только к первому изображению
                if (i === 0) {
                  mediaItem.caption = contentWithLineBreaks;
                  mediaItem.parse_mode = 'HTML';
                }
                
                media.push(mediaItem);
              }
            }
            
            // Отправляем медиа-группу
            if (media.length > 0) {
              const mediaGroupData = {
                chat_id: chatId,
                media: media
              };
              
              telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mediaGroupData)
              });
            } else {
              // Если не удалось подготовить ни одно изображение, отправляем текстовое сообщение
              const messageData = {
                chat_id: chatId,
                text: contentWithLineBreaks,
                parse_mode: 'HTML'
              };
              
              telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
              });
            }
          }
        } else if (hasLegacyImage) {
          // Обратная совместимость со старым полем image_url
          if (post.image_url.startsWith('data:image/')) {
            console.log('Sending legacy base64 image for post:', post.id);
            
            // Обрабатываем base64 изображение
            const base64Data = post.image_url.split(',')[1];
            const mimeType = post.image_url.split(';')[0].split(':')[1];
            
            // Конвертируем base64 в Uint8Array
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Создаем FormData для загрузки фото
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('caption', contentWithLineBreaks);
            formData.append('parse_mode', 'HTML');
            formData.append('photo', new Blob([bytes], { type: mimeType }), 'image.png');

            telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
          } else {
            console.log('Sending legacy URL image for post:', post.id);
            
            // Обрабатываем обычный URL изображения
            const photoData = {
              chat_id: chatId,
              photo: post.image_url,
              caption: contentWithLineBreaks,
              parse_mode: 'HTML'
            };

            telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(photoData)
            });
          }
        } else {
          console.log('Sending text message for post:', post.id);
          
          // Отправляем текстовое сообщение
          const messageData = {
            chat_id: chatId,
            text: contentWithLineBreaks,
            parse_mode: 'HTML'
          };

          telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
          });
        }

        const telegramResult = await telegramResponse.json();
        console.log('Telegram API response for post', post.id, ':', telegramResult);

        if (telegramResponse.ok && telegramResult.ok) {
          // Mark as sent
          await supabase
            .from('posts')
            .update({ status: 'sent' })
            .eq('id', post.id);

          results.push({ 
            postId: post.id, 
            status: 'sent', 
            messageId: telegramResult.result.message_id 
          });
          
          console.log('Successfully sent post:', post.id);
        } else {
          // Mark as failed
          await supabase
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id);

          const errorDescription = telegramResult.description || 'Unknown error';
          console.error('Failed to send post:', post.id, 'Error:', errorDescription);

          results.push({ 
            postId: post.id, 
            status: 'failed', 
            error: errorDescription 
          });
        }
      } catch (error) {
        console.error('Error sending post:', post.id, error);
        
        // Mark as failed
        await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('id', post.id);

        results.push({ 
          postId: post.id, 
          status: 'failed', 
          error: error.message 
        });
      }
    }

    console.log('Processing complete. Results:', results);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
