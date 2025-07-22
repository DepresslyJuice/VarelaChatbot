import TelegramBot from 'node-telegram-bot-api';
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import dotenv from 'dotenv';

dotenv.config();

// Configura el bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Configura el cliente de Azure Foundry
const client = new ModelClient(
  process.env.AZURE_INFERENCE_SDK_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_INFERENCE_SDK_KEY)
);

// Maneja el mensaje del usuario
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    const response = await client.path("chat/completions").post({
      body: {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        model: process.env.DEPLOYMENT_NAME,
      },
    });

    const reply = response.body?.choices?.[0]?.message?.content ?? "Sin respuesta del modelo.";
    bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error("Error al consultar Azure Foundry:", error);
    bot.sendMessage(chatId, "Ocurrió un error al procesar tu mensaje.");
  }
});
