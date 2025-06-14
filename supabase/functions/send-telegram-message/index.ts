
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

    // Get all scheduled posts that should be sent now
    const now = new Date().toISOString()
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)

    if (fetchError) {
      console.error('Error fetching posts:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: 'No posts to send' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get bot configuration
    const { data: botConfig, error: configError } = await supabase
      .from('bot_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (configError || !botConfig) {
      console.error('Error fetching bot config:', configError)
      return new Response(JSON.stringify({ error: 'Bot configuration not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    // Send each post
    for (const post of posts) {
      try {
        let telegramResponse
        const chatId = post.chat_id || botConfig.chat_id

        if (post.image_url) {
          // Send photo with caption
          const photoData = {
            chat_id: chatId,
            photo: post.image_url,
            caption: post.content,
            parse_mode: 'HTML'
          }

          telegramResponse = await fetch(`https://api.telegram.org/bot${botConfig.token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(photoData)
          })
        } else {
          // Send text message
          const messageData = {
            chat_id: chatId,
            text: post.content,
            parse_mode: 'HTML'
          }

          telegramResponse = await fetch(`https://api.telegram.org/bot${botConfig.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
          })
        }

        const telegramResult = await telegramResponse.json()

        if (telegramResponse.ok && telegramResult.ok) {
          // Mark as sent
          await supabase
            .from('posts')
            .update({ status: 'sent' })
            .eq('id', post.id)

          results.push({ 
            postId: post.id, 
            status: 'sent', 
            messageId: telegramResult.result.message_id 
          })
        } else {
          // Mark as failed
          await supabase
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id)

          results.push({ 
            postId: post.id, 
            status: 'failed', 
            error: telegramResult.description || 'Unknown error' 
          })
        }
      } catch (error) {
        console.error('Error sending post:', post.id, error)
        
        // Mark as failed
        await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('id', post.id)

        results.push({ 
          postId: post.id, 
          status: 'failed', 
          error: error.message 
        })
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
