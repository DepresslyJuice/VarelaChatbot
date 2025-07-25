import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

dotenv.config();

const app = express();
app.use(express.json());

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.AZURE_INFERENCE_SDK_ENDPOINT) {
  console.error('AZURE_INFERENCE_SDK_ENDPOINT is required');
  process.exit(1);
}

if (!process.env.AZURE_INFERENCE_SDK_KEY) {
  console.error('AZURE_INFERENCE_SDK_KEY is required');
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// Set webhook only if APP_URL is provided
if (process.env.APP_URL) {
  bot.setWebHook(`${process.env.APP_URL}/webhook`);
  console.log(`Webhook set to: ${process.env.APP_URL}/webhook`);
} else {
  console.log('APP_URL not set, webhook not configured');
}

// Azure client
const client = new ModelClient(
  process.env.AZURE_INFERENCE_SDK_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_INFERENCE_SDK_KEY)
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
        model: process.env.DEPLOYMENT_NAME,
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
