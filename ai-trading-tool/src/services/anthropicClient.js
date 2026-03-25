const fetch = require("node-fetch");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

async function sendMessage(apiKey, model, system, userMessage) {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1400,
        system: system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Anthropic returned an error");
    }

    return data.content;
  } catch (error) {
    throw new Error(`Error sending message to Anthropic API: ${error.message}`);
  }
}

module.exports = {
  sendMessage,
};