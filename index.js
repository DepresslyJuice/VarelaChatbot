import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

dotenv.config();

const app = express();
app.use(express.json());

// Set default values if environment variables are not set
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8018145264:AAH3RQkd_KWqbTP3KoCoRS9f_OdLk1pifMA';
const AZURE_INFERENCE_SDK_ENDPOINT = process.env.AZURE_INFERENCE_SDK_ENDPOINT || 'https://jdvarelac-1909-resource.services.ai.azure.com/models';
const AZURE_INFERENCE_SDK_KEY = process.env.AZURE_INFERENCE_SDK_KEY || '2SYvekF9Ek14CppV5OkbZNgbI1GhseGs3iLQj3KYTr3dFVrGFLq1JQQJ99BGACHYHv6XJ3w3AAAAACOGzAlb';
const DEPLOYMENT_NAME = process.env.DEPLOYMENT_NAME || 'Phi-4-mini-instruct';
const APP_URL = process.env.APP_URL || 'https://chatbotvarela-fqcyg8g7hfhtbbbk.westus-01.azurewebsites.net';

console.log('Environment variables loaded:', {
  TELEGRAM_BOT_TOKEN: TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET',
  AZURE_INFERENCE_SDK_ENDPOINT: AZURE_INFERENCE_SDK_ENDPOINT ? 'SET' : 'NOT SET',
  AZURE_INFERENCE_SDK_KEY: AZURE_INFERENCE_SDK_KEY ? 'SET' : 'NOT SET',
  DEPLOYMENT_NAME: DEPLOYMENT_NAME ? 'SET' : 'NOT SET',
  APP_URL: APP_URL ? 'SET' : 'NOT SET'
});

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Set webhook
bot.setWebHook(`${APP_URL}/webhook`);
console.log(`Webhook set to: ${APP_URL}/webhook`);

// Azure client
const client = new ModelClient(
  AZURE_INFERENCE_SDK_ENDPOINT,
  new AzureKeyCredential(AZURE_INFERENCE_SDK_KEY)
);

app.get('/', (req, res) => {
  res.send('Telegram Bot is running! ✔️');
});

app.get('/status', (req, res) => {
  res.send('Bot corriendo ✔️');
});


// Ruta que Telegram llamará
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Mensajes del usuario
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  try {
    const response = await client.path('chat/completions').post({
      body: {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: userText },
        ],
        model: DEPLOYMENT_NAME,
        max_tokens: 500,
      },
    });

    const reply = response.body?.choices?.[0]?.message?.content ?? 'Sin respuesta del modelo.';
    bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, 'Ocurrió un error procesando tu mensaje.');
  }
});

// Puerto para Azure (usa el proporcionado o 8080 por defecto)
const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
