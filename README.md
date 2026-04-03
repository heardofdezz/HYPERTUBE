# Hypertube

A free, open streaming app for movies, TV shows, and anime. Netflix-style UI powered by live torrent search across multiple providers.

## Tech Stack

- **Frontend:** Vue 3, Vuetify 3, Vue Router, Lucide Icons, Axios
- **Backend:** Node.js, Express 5, Mongoose/MongoDB
- **Torrent Search:** torrent-search-api (ThePirateBay, 1337x, YTS, etc.)
- **Metadata:** OMDB API for covers, ratings, genres, cast
- **Build:** Webpack 5, Babel 7
- **DevOps:** Docker Compose, GitHub Actions CI

## Features

- Netflix-style browse page with hero banner and genre-based category rows
- Live torrent search across multiple providers
- Movie/show detail pages with metadata, cast, and comments
- Background seeder auto-populates the database on startup
- OMDB enrichment adds posters, ratings, genres, and plot summaries
- Subtitle support via OpenSubtitles API
- Fully responsive dark theme

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

# Install server dependencies
cd server && npm install

# Install client dependencies
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

Edit `server/.env` and add your OMDB API key:

```
IMDB_API_KEY=your-omdb-key
```

See `.env.example` for all available settings (torrent providers, search limits, etc.)

### 4. Run development servers

```bash
# Terminal 1 - Server (localhost:8081)
cd server && npm start

# Terminal 2 - Client (localhost:8080)
cd client && npm run dev
```

The background seeder will automatically search for popular movies, TV shows, and anime and populate the database. OMDB enrichment runs after seeding to add posters, ratings, and genres.

### 5. Run with Docker (optional)

```bash
docker compose up --build
```

This starts MongoDB, the server, and the client together.

## Testing

```bash
cd server && npm test
```

## Project Structure

```
HYPERTUBE/
├── client/                    # Vue.js frontend
│   ├── build/                 # Webpack configuration
│   ├── src/
│   │   ├── components/        # Index, Movies, MovieDetail, Header
│   │   ├── router/            # Vue Router (Home, Browse, MovieDetail)
│   │   ├── services/          # API client, MoviesService
│   │   └── store/             # Vuex store
│   └── Dockerfile
├── server/                    # Express backend
│   ├── src/
│   │   ├── controllers/       # MovieController, SearchController
│   │   ├── services/          # TorrentSearchService, ImdbService
│   │   ├── models/            # Movie (Mongoose schema)
│   │   ├── routers/           # movie, comment routes
│   │   ├── config/            # Config, setup (seeder)
│   │   └── functions/         # Streaming helpers
│   └── Dockerfile
├── docker-compose.yml         # MongoDB + server + client
└── .github/workflows/ci.yml   # CI pipeline
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies` | Browse cached movies (supports query, category, sort, limit, page) |
| GET | `/search` | Live torrent search (query, category, limit) |
| GET | `/categories` | List available genres |
| GET | `/subtitles/:id` | Download subtitles (EN/FR) |
| POST | `/comment/:id` | Add a comment to a movie |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/hypertube` | MongoDB connection string |
| `IMDB_API_KEY` | — | OMDB API key for metadata enrichment |
| `TORRENT_PROVIDERS` | `ThePirateBay` | Comma-separated torrent providers |
| `TORRENT_SEARCH_LIMIT` | `20` | Max results per search |
| `TORRENT_CACHE_TTL_HOURS` | `24` | Hours before cached results are refreshed |
| `PORT` | `8081` | Server port |
| `CORS_ORIGINS` | `http://localhost:8080` | Allowed CORS origins |

## License

MIT
