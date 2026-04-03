# Hypertube

A free, open streaming app for movies, TV shows, and anime. Netflix-style UI with torrent-powered playback and continuous content discovery.

## Tech Stack

- **Frontend:** Vue 3, Vuetify 3, Vue Router, Lucide Icons, Axios
- **Backend:** Node.js, Express 5, Mongoose/MongoDB
- **Streaming:** torrent-stream (magnet-to-HTTP with range requests, pre-buffering, tracker injection)
- **Torrent Search:** torrent-search-api (ThePirateBay + configurable providers)
- **Metadata:** OMDB API (posters, ratings, genres, cast) with 1,000/day quota management
- **Process Manager:** PM2 (auto-restart, background operation, memory limits)
- **Build:** Webpack 5, Babel 7
- **DevOps:** Docker Compose, GitHub Actions CI

## Features

- Netflix-style browse page with hero banner and genre-based category rows
- Torrent-powered video player with pre-buffering progress ring (peers, speed, download stats)
- Live torrent search across multiple providers
- Continuous background seeder — automatically discovers and adds new content 24/7
- OMDB enrichment with daily quota management (950 seeder + 50 reserved for search)
- Subtitle support (EN/FR) via OpenSubtitles API
- Movie detail pages with metadata, cast, and comments
- No login required — completely open and free
- PM2 process management — auto-restarts on crash, runs in background
- Fully responsive dark theme

## How It Works

1. **Continuous seeder** cycles through 80+ search queries (movies, TV shows, anime) across torrent providers — runs 24/7 via PM2
2. Each result is deduplicated by IMDB code — multiple torrents of the same title merge into one entry with multiple magnet links
3. **OMDB enrichment** adds posters, genres, ratings, and plot summaries (respects 1,000/day free tier limit with adaptive pacing)
4. When quota runs low, the seeder slows down; when exhausted, it saves torrents without metadata and resumes enrichment the next day
5. **Playback** selects the best magnet (highest seeds), injects public trackers, pre-buffers 2MB, then streams video over HTTP with range requests
6. Downloaded files are cached to disk for instant replay

## Prerequisites

- Node.js >= 14
- npm >= 6
- MongoDB (local via Docker or installed)
- OMDB API key (free at https://www.omdbapi.com/apikey.aspx)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/heardofdezz/HYPERTUBE.git
cd HYPERTUBE

cd server && npm install
cd ../client && npm install
```

### 2. Start MongoDB

```bash
# Option A: Docker
docker compose up mongo -d

# Option B: Local install (macOS)
brew services start mongodb-community
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Add your OMDB API key to `server/.env`:

```
IMDB_API_KEY=your-omdb-key
```

### 4. Run

```bash
# Production (PM2 — runs in background, auto-restarts)
cd server && npm start

# Development (nodemon — auto-reload on file changes)
cd server && npm run dev

# Client
cd client && npm run dev
```

The continuous seeder starts automatically and populates the database 24/7.

### Server Management (PM2)

```bash
cd server

npm start          # Start server in background
npm stop           # Stop server
npm restart        # Restart server
npm run logs       # Tail live logs
npm run status     # Check if running
```

PM2 auto-restarts on crash, caps memory at 500MB, and keeps the seeder running continuously.

### 5. Docker (optional)

```bash
docker compose up --build
```

## Testing

```bash
cd server && npm test
```

## Project Structure

```
HYPERTUBE/
├── client/
│   └── src/
│       ├── components/        # Index, Movies, MovieDetail, VideoPlayer, Header
│       ├── router/            # Home, Browse, MovieDetail, Watch
│       └── services/          # Api, MoviesService
├── server/
│   ├── ecosystem.config.js    # PM2 configuration
│   └── src/
│       ├── controllers/       # MovieController, SearchController
│       ├── services/          # TorrentSearchService, ImdbService
│       ├── models/            # Movie schema
│       ├── routers/           # stream, prepare, subtitles, categories, comments
│       ├── config/            # Config, continuous seeder
│       └── functions/         # HTTP range streaming
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies` | Browse cached movies (query, category, sort, limit, page) |
| GET | `/search` | Live torrent search with OMDB enrichment |
| GET | `/movie/:id` | Single movie details with magnet availability |
| GET | `/prepare/:id` | Start torrent + return buffering progress (peers, speed, %) |
| GET | `/stream/:id` | Torrent-to-HTTP video stream (range requests) |
| GET | `/categories` | List available genres |
| GET | `/subtitles/:id` | Fetch subtitles (EN/FR) |
| GET | `/subtitles-file/:filename` | Serve VTT subtitle files |
| POST | `/comment/:id` | Add a comment to a movie |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/hypertube` | MongoDB connection string |
| `IMDB_API_KEY` | — | OMDB API key (free: 1,000 requests/day) |
| `TORRENT_PROVIDERS` | `ThePirateBay` | Comma-separated torrent providers |
| `TORRENT_SEARCH_LIMIT` | `20` | Default results per search |
| `TORRENT_CACHE_TTL_HOURS` | `24` | Cache freshness window |
| `PORT` | `8081` | Server port |
| `CORS_ORIGINS` | `http://localhost:8080` | Allowed CORS origins |

## License

MIT
