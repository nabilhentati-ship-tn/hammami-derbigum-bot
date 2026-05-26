const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CATALOGUE_URL  = process.env.CATALOGUE_URL;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
console.log("🤖 Bot Fiches Techniques Hammami démarré !");

let fiches = [];
let lastFetch = 0;

async function loadFiches() {
  if (Date.now() - lastFetch < 5 * 60 * 1000) return;
  try {
    const res = await fetch(CATALOGUE_URL);
    const csv = await res.text();
    const lines = csv.trim().split("\n").slice(1);
    fiches = lines.map(line => {
      const cols = line.split(",");
      return {
        nom:     (cols[0] || "").replace(/"/g, "").trim(),
        famille: (cols[1] || "").replace(/"/g, "").trim(),
        lien:    (cols[3] || "").replace(/"/g, "").trim(),
      };
    }).filter(p => p.nom);
    lastFetch = Date.now();
    console.log(`✅ ${fiches.length} fiches chargées`);
  } catch (e) {
    console.error("Erreur:", e.message);
  }
}

function rechercher(query) {
  const mots = query.toLowerCase().trim().split(/\s+/);
  return fiches.filter(f => {
    const texte = (f.nom + " " + f.famille).toLowerCase();
    return mots.every(mot => texte.includes(mot));
  });
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return;

  await loadFiches();

  if (text === "/start" || text === "/aide") {
    return bot.sendMessage(chatId,
      `👋 *Fiches Techniques — Comptoir Hammami*\n\nFamilles disponibles :\n• 🔵 Derbigum\n• 🟢 Isolation\n\nTape le nom d'un produit :\n\n• carocol\n• chebigol\n• isolation toiture\n• derbigum\n\nJe t'envoie le lien PDF directement.`,
      { parse_mode: "Markdown" }
    );
  }

  if (text === "/liste") {
    const familles = [...new Set(fiches.map(f => f.famille))];
    const liste = familles.map(f => {
      const count = fiches.filter(p => p.famille === f).length;
      return `• ${f} : ${count} fiches`;
    }).join("\n");
    return bot.sendMessage(chatId,
      `📚 *Catalogue complet :*\n\n${liste}\n\n_Total : ${fiches.length} fiches_`,
      { parse_mode: "Markdown" }
    );
  }

  const resultats = rechercher(text);

  if (resultats.length === 0) {
    return bot.sendMessage(chatId,
      `❓ Aucune fiche trouvée pour *"${text}"*\n\nEssaie avec un autre mot-clé ou tape /liste pour voir tout le catalogue.`,
      { parse_mode: "Markdown" }
    );
  }

  if (resultats.length > 8) {
    const liste = resultats.slice(0, 8).map(f => `• ${f.nom} _(${f.famille})_`).join("\n");
    return bot.sendMessage(chatId,
      `🔍 *${resultats.length} fiches trouvées* (top 8) :\n\n${liste}\n\n_Précise ta recherche._`,
      { parse_mode: "Markdown" }
    );
  }

  const reponse = resultats.map(f =>
    `📄 *${f.nom}*\n🏷️ ${f.famille}\n[👉 Ouvrir la fiche PDF](${f.lien})`
  ).join("\n\n");

  bot.sendMessage(chatId, reponse, { parse_mode: "Markdown" });
});

console.log("En attente de messages...");
