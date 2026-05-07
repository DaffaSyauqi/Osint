# Sentinel OSINT

Sentinel OSINT is a Multi-source Intelligence Dashboard designed to track and visualize data from various OSINT (Open Source Intelligence) feeds in real-time.

## Features

- **Live Map Visualization:** Tracks global points of interest, including aircraft and other geopolitical events, using OpenLayers and CARTO dark maps.
- **Multi-Feed Integration:**
  - **Social Media:** Latest OSINT-related tweets and updates.
  - **News:** Breaking news and regional developments.
  - **Telegram:** Secure channel monitoring.
  - **Aviation:** Flight tracking for military and government aircraft.
- **Responsive UI:** Built with Vue 3 and Tailwind CSS for a seamless dark-mode tactical interface.

## Environment Variables

For local development or deployment, create a `.env` file based on `.env.example` and provide the following variables:

```env
API_TWEETS_URL=
API_NEWS_URL=
API_TELEGRAM_URL=
API_PLANES_URL=
```

## Tech Stack

- **Frontend:** Vue 3, Tailwind CSS, OpenLayers, Lucide Icons
- **Backend (API):** Node.js API Routes (Vercel compatible)
- **Build Tool:** Vite

## Getting Started

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment variables in `.env`.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
