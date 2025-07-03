/// <reference types="https://deno.land/x/deploy/mod.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Declare Deno API
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to call the send-telegram-message function
async function callSendFunction() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      console.error('SUPABASE_URL environment variable not set');
      return;
    }
    
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('SERVICE_ROLE_KEY environment variable not set');
      return;
    }

    // Call the send-telegram-message edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-telegram-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error calling send-telegram-message: ${response.status} ${response.statusText}`, errorText);
      return;
    }

    const result = await response.json();
    console.log('Successfully called send-telegram-message function:', result);
  } catch (error) {
    console.error('Error calling send-telegram-message function:', error);
  }
}

// Start the scheduler when the function is invoked
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract parameters from the request, if any
    const { interval = 60 } = await req.json().catch(() => ({}));
    
    // Validate interval (minimum 10 seconds)
    const checkInterval = Math.max(10, parseInt(String(interval), 10)) * 1000;
    
    console.log(`Starting scheduler with ${checkInterval / 1000} second interval`);
    
    // Initial call
    await callSendFunction();
    
    // Setup interval timer
    const timerId = setInterval(callSendFunction, checkInterval);
    
    // Return immediate response to client
    return new Response(JSON.stringify({ 
      message: `Scheduler started with ${checkInterval / 1000} second interval`,
      note: "This edge function will continue running in the background until it times out or is stopped"
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scheduler function error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 