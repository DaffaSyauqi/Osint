import axios from "axios";

const mockTweets = [
  { source: "Bloomberg", text: "Global markets await inflation data as tensions rise in Middle East sector.", created_at: new Date().toISOString() },
  { source: "Reuters", text: "New satellite imagery reveals increased activity at regional military bases.", created_at: new Date().toISOString(), image_url: "https://picsum.photos/seed/osint1/800/600" }
];

export default async function handler(req: any, res: any) {
  const TWEETS_URL = process.env.API_TWEETS_URL;
  try {
    if (!TWEETS_URL) throw new Error("API_TWEETS_URL is missing");
    const response = await axios.get(TWEETS_URL, { timeout: 10000 });
    res.status(200).json(response.data);
  } catch (e) {
    console.error("Tweets fetch error:", e instanceof Error ? e.message : e);
    res.status(200).json(mockTweets);
  }
}
