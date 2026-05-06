import axios from "axios";

const mockTelegram = [
  { channel: "warmonitors", text: "Reported explosion heard in Sector 4. Awaiting confirmation.", date: new Date().toISOString() },
  { channel: "rnintel", text: "Strategic bomber deployment observed at northern airfields.", date: new Date().toISOString() }
];

export default async function handler(req: any, res: any) {
  const TELEGRAM_URL = process.env.API_TELEGRAM_URL || "https://tele-production-a6a3.up.railway.app/telegram";
  try {
    const response = await axios.get(TELEGRAM_URL, { timeout: 10000 });
    res.status(200).json(response.data);
  } catch (e) {
    console.error("Telegram fetch error:", e instanceof Error ? e.message : e);
    res.status(200).json(mockTelegram);
  }
}
