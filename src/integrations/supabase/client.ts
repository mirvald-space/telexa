// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Получаем URL и ключ из переменных окружения
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Выводим информацию о подключении для отладки
console.log("Supabase URL:", SUPABASE_URL);
console.log("Supabase Key used:", SUPABASE_PUBLISHABLE_KEY ? "Key is defined" : "Key is not defined");

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);