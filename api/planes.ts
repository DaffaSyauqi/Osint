import axios from "axios";

const mockPlanes = {
  data: [
    { callsign: "RCH452", hex: "AE1234", lat: -6.2, lon: 106.8, altitude: 32000, speed: 450, type: "C17", tile: "Jakarta", is_military: true },
    { callsign: "TNI01", hex: "8A1122", lat: -2.5, lon: 120.0, altitude: 15000, speed: 280, type: "CN235", tile: "Sulawesi", is_military: true }
  ]
};

export default async function handler(req: any, res: any) {
  const PLANES_URL = process.env.API_PLANES_URL || "https://web-production-b0130.up.railway.app/plane";
  try {
    const response = await axios.get(PLANES_URL, { timeout: 10000 });
    res.status(200).json(response.data);
  } catch (e) {
    console.error("Planes fetch error:", e instanceof Error ? e.message : e);
    res.status(200).json(mockPlanes);
  }
}
