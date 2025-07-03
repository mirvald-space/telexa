#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Проверяем, находимся ли мы в среде CI/CD (Vercel)
const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';

// Функция для выполнения команды и вывода результата
function runCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, { stdio: 'inherit' });
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

// Основная функция деплоя
async function deployFunctions() {
  console.log('Starting Supabase functions deployment...');

  // Создаем временный файл с токеном для Supabase CLI
  if (isCI) {
    // В CI/CD среде используем переменные окружения
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('SUPABASE_ACCESS_TOKEN is not set. Please set it in your Vercel environment variables.');
      process.exit(1);
    }

    // Создаем временную директорию .supabase, если она не существует
    const supabaseDir = path.join(process.env.HOME || process.env.USERPROFILE, '.supabase');
    if (!fs.existsSync(supabaseDir)) {
      fs.mkdirSync(supabaseDir, { recursive: true });
    }

    // Записываем токен в файл
    const tokenFile = path.join(supabaseDir, 'access-token');
    fs.writeFileSync(tokenFile, accessToken);
    console.log('Supabase access token configured.');
  }

  // Деплоим функции
  console.log('Deploying send-telegram-message function...');
  runCommand('npx supabase functions deploy send-telegram-message --project-ref bqysahcurgznnigptlqf');

  console.log('Deploying scheduler function...');
  runCommand('npx supabase functions deploy scheduler --project-ref bqysahcurgznnigptlqf');

  console.log('Supabase functions deployed successfully!');

  // Запускаем scheduler
  if (isCI) {
    console.log('Starting scheduler...');
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceRoleKey) {
        const response = await fetch(`${supabaseUrl}/functions/v1/scheduler`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ interval: 60 })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Scheduler started successfully:', result);
        } else {
          const errorText = await response.text();
          console.error(`Error starting scheduler: ${response.status} ${response.statusText}`, errorText);
        }
      } else {
        console.log('Skipping scheduler start: missing environment variables');
      }
    } catch (error) {
      console.error('Error starting scheduler:', error);
    }
  }
}

// Запускаем деплой
deployFunctions().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
}); 