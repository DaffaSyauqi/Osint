import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import https from "https";
import EventEmitter from "events";

// Increase default max listeners to avoid warnings on concurrent connections
EventEmitter.defaultMaxListeners = 100;

// Use a shared keep-alive agent for better performance and to prevent socket exhaustion
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
axios.defaults.timeout = 10000;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mock data for initial demonstration
  const mockTweets = [
    { source: "Bloomberg", text: "Global markets await inflation data as tensions rise in Middle East sector.", created_at: new Date().toISOString() },
    { source: "Reuters", text: "New satellite imagery reveals increased activity at regional military bases.", created_at: new Date().toISOString(), image_url: "https://picsum.photos/seed/osint1/800/600" }
  ];

  const mockNews = [
    { title: "Regional Cooperation Summit Announced", summary: "Leaders to meet in Jakarta for security talks next week.", source: "Antara", published: new Date().toISOString() },
    { title: "Coastal Guard Intercepts Unidentified Vessel", summary: "Authorities report a successful operation near the Malacca Strait.", source: "Antara", published: new Date().toISOString() }
  ];

  const mockTelegram = [
    { channel: "warmonitors", text: "Reported explosion heard in Sector 4. Awaiting confirmation.", date: new Date().toISOString() },
    { channel: "rnintel", text: "Strategic bomber deployment observed at northern airfields.", date: new Date().toISOString() }
  ];

  const mockPlanes = {
    data: [
      { callsign: "RCH452", hex: "AE1234", lat: -6.2, lon: 106.8, altitude: 32000, speed: 450, type: "C17", tile: "Jakarta", is_military: true },
      { callsign: "TNI01", hex: "8A1122", lat: -2.5, lon: 120.0, altitude: 15000, speed: 280, type: "CN235", tile: "Sulawesi", is_military: true }
    ]
  };

  const TWEETS_URL = process.env.API_TWEETS_URL;
  const NEWS_URL = process.env.API_NEWS_URL;
  const TELEGRAM_URL = process.env.API_TELEGRAM_URL;
  const PLANES_URL = process.env.API_PLANES_URL;

  // API Routes with Proxy Fallback
  app.get("/api/tweets", async (req, res) => {
    try {
      if (!TWEETS_URL) throw new Error("API_TWEETS_URL not set in environment");
      const response = await axios.get(TWEETS_URL, { timeout: 10000 });
      res.json(response.data);
    } catch (e) {
      console.error("Tweets fetch error:", e instanceof Error ? e.message : e);
      res.json(mockTweets);
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      if (!NEWS_URL) throw new Error("API_NEWS_URL not set in environment");
      const response = await axios.get(NEWS_URL, { timeout: 10000 });
      res.json(response.data);
    } catch (e) {
      console.error("News fetch error:", e instanceof Error ? e.message : e);
      res.json(mockNews);
    }
  });

  app.get("/api/telegram", async (req, res) => {
    try {
      if (!TELEGRAM_URL) throw new Error("API_TELEGRAM_URL not set in environment");
      const response = await axios.get(TELEGRAM_URL, { timeout: 10000 });
      res.json(response.data);
    } catch (e) {
      console.error("Telegram fetch error:", e instanceof Error ? e.message : e);
      res.json(mockTelegram);
    }
  });

  app.get("/api/planes", async (req, res) => {
    try {
      if (!PLANES_URL) throw new Error("API_PLANES_URL not set in environment");
      const response = await axios.get(PLANES_URL, { timeout: 10000 });
      res.json(response.data);
    } catch (e) {
      console.error("Planes fetch error:", e instanceof Error ? e.message : e);
      res.json(mockPlanes);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
