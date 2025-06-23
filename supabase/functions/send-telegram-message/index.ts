import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Post {
  id: string;
  content: string;
  image_url?: string;
  image_urls?: string[];
  scheduled_time: string;
  status: 'scheduled' | 'sent' | 'failed';
  created_at: string;
  chat_ids?: string[];
  user_id?: string;
}

interface ResultItem {
  postId: string;
  status: string;
  error?: string;
  messageId?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Парсинг массива изображений
function parseImageUrls(imageUrls: string[] | string | null | undefined): string[] {
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

// Отправка одного изображения
async function sendPhoto(botToken: string, chatId: string, imageUrl: string, caption: string) {
  if (imageUrl.startsWith('data:image/')) {
    const [header, base64Data] = imageUrl.split(',');
    const mimeType = header.split(';')[0].split(':')[1];
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('photo', new Blob([bytes], { type: mimeType }), 'image.png');

    return fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
  } else {
    return fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: imageUrl,
        caption: caption
      })
    });
  }
}

// Отправка медиагруппы
async function sendMediaGroup(botToken: string, chatId: string, imageUrls: string[], caption: string) {
  const media = imageUrls.map((url, index) => ({
    type: 'photo' as const,
    media: url,
    ...(index === 0 ? { caption } : {})
  }));

  return fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      media: media
    })
  });
}

// Отправка текста
async function sendMessage(botToken: string, chatId: string, text: string) {
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}

// Обработка одного поста
async function processPost(post: Post, botToken: string, supabase: any): Promise<ResultItem> {
  const { id, content, image_url, image_urls, chat_ids } = post;
  
  console.log('Processing post:', id);
  
  if (!chat_ids) {
    await supabase.from('posts').update({ status: 'failed' }).eq('id', id);
    return { postId: id, status: 'failed', error: 'No chat ID specified' };
  }

  try {
    let imageUrls = [];

    // If image_urls array exists, use it
    if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
      imageUrls = post.image_urls;
    } 
    // If legacy image_url exists, convert it to an array with one element
    else if (post.image_url && post.image_url.trim() !== '') {
      imageUrls = [post.image_url];
    }

    const hasImages = imageUrls.length > 0;
    
    let telegramResponse;
    
    if (hasImages) {
      if (imageUrls.length === 1) {
        telegramResponse = await sendPhoto(botToken, chat_ids[0], imageUrls[0], content);
      } else {
        telegramResponse = await sendMediaGroup(botToken, chat_ids[0], imageUrls, content);
      }
    } else if (image_url && image_url.trim() !== '') {
      telegramResponse = await sendPhoto(botToken, chat_ids[0], image_url, content);
    } else {
      telegramResponse = await sendMessage(botToken, chat_ids[0], content);
    }

    const result = await telegramResponse.json();
    
    if (telegramResponse.ok && result.ok) {
      await supabase.from('posts').update({ status: 'sent' }).eq('id', id);
      
      const messageId = Array.isArray(result.result) 
        ? result.result[0].message_id 
        : result.result.message_id;
        
      console.log('Successfully sent post:', id);
      return { postId: id, status: 'sent', messageId };
    } else {
      await supabase.from('posts').update({ status: 'failed' }).eq('id', id);
      console.error('Failed to send post:', id, 'Error:', result.description);
      return { postId: id, status: 'failed', error: result.description || 'Unknown error' };
    }
  } catch (error) {
    await supabase.from('posts').update({ status: 'failed' }).eq('id', id);
    console.error('Error sending post:', id, error);
    return { 
      postId: id, 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const nowISO = new Date().toISOString();
    console.log('Checking for posts scheduled at or before:', nowISO);

    const { data: postsData, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', nowISO);

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Found posts to send:', postsData?.length || 0);

    if (!postsData || postsData.length === 0) {
      return new Response(JSON.stringify({ message: 'No posts to send', results: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results: ResultItem[] = [];
    
    for (const postData of postsData) {
      const post: Post = {
        id: postData.id,
        content: postData.content,
        image_url: postData.image_url,
        image_urls: postData.image_urls,
        scheduled_time: postData.scheduled_time,
        status: postData.status,
        created_at: postData.created_at,
        chat_id: postData.chat_id,
        user_id: postData.user_id
      };
      
      // Преобразуем переносы строк в теги <br>
      const contentWithLineBreaks = post.content.replace(/\n/g, '<br>');
      
      const result = await processPost(post, botToken, supabase);
      results.push(result);
    }

    console.log('Processing complete. Results:', results.length);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});