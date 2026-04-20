# Hypertube

A self-hosted torrent streaming engine with a Vue 3 frontend. Point it at a magnet URI (or configure your own torrent search providers) and it streams the video to your browser while it downloads.

> **Intended for public-domain content, material you own, and authorized use.** You are responsible for what you do with this software. Downloading or streaming copyrighted material without permission is illegal in most jurisdictions.

## What it does

- Streams video from a torrent magnet URI over HTTP with range requests (pre-buffering, tracker injection)
- Plays in a standard browser video player — no install on the client
- Caches downloaded files to disk for instant replay
- Resume watching, per-episode subtitles, season/episode structure for series
- **Optional:** live torrent search across user-configured providers
- **Optional:** background indexer that runs user-supplied search queries on a loop

The search and indexer features are opt-in. Out of the box no providers are enabled and no queries run.

## Stack

Vue 3 + Vuetify · Node 14+/Express · MongoDB · torrent-stream · Webpack · Docker

---

## Quick start

You'll need:

- **Docker** (easiest) — or Node 14+, npm, and MongoDB installed locally
- An **OMDB API key** (free, 1 minute to get): https://www.omdbapi.com/apikey.aspx

### 1. Clone and install

```bash
git clone https://github.com/heardofdezz/HYPERTUBE.git
cd HYPERTUBE

cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Start MongoDB

```bash
docker compose up mongo -d
```

(Or install MongoDB locally — `brew services start mongodb-community` on macOS.)

### 3. Configure

```bash
cp server/.env.example server/.env
```

Open `server/.env` and paste your OMDB key:

```
IMDB_API_KEY=your-omdb-key
```

That's the minimum. The other settings are optional — see the comments in `.env.example` if you want to enable torrent search.

### 4. Run

```bash
# Server (in one terminal)
cd server && npm run dev

# Client (in another terminal)
cd client && npm run dev
```

Open http://localhost:8080 in your browser.

### All-in-one: Docker Compose

```bash
docker compose up --build
```

---

## Server management

For long-running deployments, the server ships with PM2 (auto-restart, memory cap):

```bash
cd server

npm start          # Start in background
npm stop           # Stop
npm restart        # Restart
npm run logs       # Tail logs
npm run status     # Check status
```

## Testing

```bash
cd server && npm test
```

## Project structure

```
HYPERTUBE/
├── client/
│   └── src/
│       ├── components/        # Index, Movies, MovieDetail, VideoPlayer, Header
│       ├── router/            # Home, Browse, MovieDetail, Watch
│       └── services/          # Api, MoviesService, ProgressService
├── server/
│   ├── ecosystem.config.js    # PM2 configuration
│   └── src/
│       ├── controllers/       # MovieController, SearchController
│       ├── services/          # TorrentSearchService, ImdbService
│       ├── models/            # Movie schema
│       ├── routers/           # stream, prepare, subtitles, categories, comments
│       ├── config/            # Config, indexer
│       └── functions/         # HTTP range streaming
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies` | Browse the local catalog (query, category, sort, limit, page) |
| GET | `/search` | Live torrent search (requires `TORRENT_PROVIDERS`) |
| GET | `/movie/:id` | Single title details |
| GET | `/prepare/:id` | Start torrent + return buffering progress |
| GET | `/stream/:id` | HTTP video stream with range requests |
| GET | `/categories` | Available genres |
| GET | `/subtitles/:id` | Fetch subtitles (EN/FR) |
| POST | `/comment/:id` | Add a comment |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/hypertube` | MongoDB connection string |
| `IMDB_API_KEY` | — | OMDB API key (free: 1,000 requests/day) |
| `TORRENT_PROVIDERS` | _(empty)_ | Comma-separated provider names (opt-in) |
| `SEARCH_QUERIES` | _(empty)_ | Comma-separated background indexer queries (opt-in) |
| `TORRENT_SEARCH_LIMIT` | `20` | Default results per search |
| `TORRENT_CACHE_TTL_HOURS` | `24` | Cache freshness window |
| `PORT` | `8081` | Server port |
| `CORS_ORIGINS` | `http://localhost:8080` | Allowed CORS origins |

## License

MIT
