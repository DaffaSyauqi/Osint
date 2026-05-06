import axios from "axios";

const mockNews = [
  { title: "Regional Cooperation Summit Announced", summary: "Leaders to meet in Jakarta for security talks next week.", source: "Antara", published: new Date().toISOString() },
  { title: "Coastal Guard Intercepts Unidentified Vessel", summary: "Authorities report a successful operation near the Malacca Strait.", source: "Antara", published: new Date().toISOString() }
];

export default async function handler(req: any, res: any) {
  const NEWS_URL = process.env.API_NEWS_URL || "https://rrs-production.up.railway.app/antara";
  try {
    const response = await axios.get(NEWS_URL, { timeout: 10000 });
    res.status(200).json(response.data);
  } catch (e) {
    console.error("News fetch error:", e instanceof Error ? e.message : e);
    res.status(200).json(mockNews);
  }
}
