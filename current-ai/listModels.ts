import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

async function listModels() {
  const res = await fetch(endpoint);
  const data = await res.json();
  console.log("🧠 Available Models:\n", JSON.stringify(data, null, 2));
}

listModels();
