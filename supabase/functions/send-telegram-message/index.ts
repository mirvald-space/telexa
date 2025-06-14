
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

    console.log('Bot config found, token length:', botConfig.token?.length || 0)

    const results = []

    // Send each post
    for (const post of posts) {
      try {
        console.log('Processing post:', post.id, 'scheduled for:', post.scheduled_time)
        
        let telegramResponse
        const chatId = post.chat_id || botConfig.chat_id

        if (post.image_url) {
          // Check if it's a base64 image
          if (post.image_url.startsWith('data:image/')) {
            console.log('Sending base64 image for post:', post.id)
            
            // Handle base64 image by converting to blob and uploading
            const base64Data = post.image_url.split(',')[1]
            const mimeType = post.image_url.split(';')[0].split(':')[1]
            
            // Convert base64 to Uint8Array
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }

            // Create form data for photo upload
            const formData = new FormData()
            formData.append('chat_id', chatId)
            formData.append('caption', post.content)
            formData.append('parse_mode', 'HTML')
            formData.append('photo', new Blob([bytes], { type: mimeType }), 'image.png')

            telegramResponse = await fetch(`https://api.telegram.org/bot${botConfig.token}/sendPhoto`, {
              method: 'POST',
              body: formData
            })
          } else {
            console.log('Sending URL image for post:', post.id)
            
            // Handle regular URL image
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
          }
        } else {
          console.log('Sending text message for post:', post.id)
          
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
        console.log('Telegram API response for post', post.id, ':', telegramResult)

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
          
          console.log('Successfully sent post:', post.id)
        } else {
          // Mark as failed
          await supabase
            .from('posts')
            .update({ status: 'failed' })
            .eq('id', post.id)

          const errorDescription = telegramResult.description || 'Unknown error'
          console.error('Failed to send post:', post.id, 'Error:', errorDescription)

          results.push({ 
            postId: post.id, 
            status: 'failed', 
            error: errorDescription 
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

    console.log('Processing complete. Results:', results)

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
