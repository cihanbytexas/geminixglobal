const axios = require("axios");

// Kullanıcı bazlı chat history
let chatHistory = {};
const MAX_HISTORY = 20;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // BDFD'den gelen JSON
  const { apiKey, bot_name, user_name, message, personality } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "apiKey is required in the request body." });
  }
  if (!message || !user_name) {
    return res.status(400).json({ error: "message and user_name are required." });
  }

  if (!chatHistory[user_name]) chatHistory[user_name] = [];

  // Bot personality metni
  const personalityText = personality ||
    `Sen ${bot_name || "ENFORCE"} Discord botusun. Kullanıcı adı: ${user_name}. Dostane, yardımsever ve gerektiğinde hafif sarkastik ol. Komutlar ve hata çözümü hakkında bilgi ver.`;

  // Chat history birleştirme
  let historyText = chatHistory[user_name]
    .map(c => `User: ${c.user}\nBot: ${c.bot}`)
    .join("\n");
  if (historyText) historyText += "\n";

  // Gemini payload - API key JSON içinde
  const payload = {
    apiKey: apiKey,
    contents: [
      {
        parts: [{ text: `${personalityText}\n${historyText}User: ${message}` }],
        role: "user"
      }
    ]
  };

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000
      }
    );

    const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Chat history güncelle
    chatHistory[user_name].push({ user: message, bot: textOutput });
    if (chatHistory[user_name].length > MAX_HISTORY) chatHistory[user_name].shift();

    res.status(200).json({
      response: textOutput,
      history: chatHistory[user_name]
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || error.message || "Unknown error";
    res.status(status).json({ error: data });
  }
};
