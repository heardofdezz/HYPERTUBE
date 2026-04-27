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

The search and indexer features are opt-in. Out of the box no providers are enabled and no queries run, so a fresh install starts with an **empty catalog** until you configure one of the two paths below.

## Stack

Vue 3 + Vuetify · Node 20+ / Express 5 · MongoDB 7 · torrent-stream · Webpack · Docker · nginx

---

## Quick start

You'll need:

- **Docker** (easiest) — or Node 20+, npm, and MongoDB 7 installed locally
- An **OMDB API key** (free, 1 minute to get): https://www.omdbapi.com/apikey.aspx

### Docker compose (recommended)

```bash
git clone https://github.com/heardofdezz/HYPERTUBE.git
cd HYPERTUBE
cp server/.env.example server/.env       # paste your OMDB key into IMDB_API_KEY
docker compose up --build
```

This brings up Mongo, the server, and an nginx-served client. Everything is reachable on a single origin at `http://localhost:8080` — the nginx container reverse-proxies API calls to the server, so there's no CORS to configure.

### Local development

```bash
git clone https://github.com/heardofdezz/HYPERTUBE.git
cd HYPERTUBE
cd server && npm install && cd ..
cd client && npm install && cd ..

# Mongo only — handy if you don't want to install it locally
docker compose up mongo -d

cp server/.env.example server/.env       # paste your OMDB key

# Two terminals:
cd server && npm run dev                 # http://localhost:8081
cd client && npm run dev                 # http://localhost:8080
```

Open http://localhost:8080.

---

## Adding content to your catalog

A fresh database is empty. There are three ways to populate it:

1. **Live search** — set `TORRENT_PROVIDERS` (e.g. `Yts,Eztv,1337x`) in `server/.env` and the `/search` endpoint will query providers on demand. See [torrent-search-api](https://www.npmjs.com/package/torrent-search-api) for the full list of supported providers.
2. **Background indexer** — set `SEARCH_QUERIES` (e.g. `public domain,classical music`) and the server runs those queries on a loop in the background, ingesting hits into Mongo. Requires `TORRENT_PROVIDERS` to be set as well.
3. **Direct magnet** — POST a magnet URI through the API (see endpoints below) or insert documents into the `movies` collection yourself.

OMDB enrichment (titles, posters, ratings) runs automatically when `IMDB_API_KEY` is set. The free OMDB tier is capped at 1,000 requests/day; the indexer paces itself to stay under that.

---

## Production deploy

The `docker compose up --build` flow is the production path — same-origin via nginx, named volumes for `mongo-data` and `server-downloads`, restart policies on every service.

If you run the server outside Docker, PM2 is wired up:

```bash
cd server
npm start            # start in background (uses ecosystem.config.js)
npm stop
npm restart
npm run logs
npm run status
```

PM2 ships with a 500MB memory cap and auto-restart on crash.

---

## Configuration

`server/.env` (copy from `server/.env.example`):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8081` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/hypertube` | Mongo connection string |
| `IMDB_API_KEY` | — | OMDB key (free, 1k req/day). Without it, no metadata enrichment. |
| `CORS_ORIGINS` | `http://localhost:8080` | Comma-separated allowed origins |
| `TORRENT_PROVIDERS` | _(empty)_ | Comma-separated [torrent-search-api](https://www.npmjs.com/package/torrent-search-api) provider names. Empty = live search disabled. |
| `SEARCH_QUERIES` | _(empty)_ | Comma-separated background indexer queries. Empty = indexer disabled. |
| `TORRENT_SEARCH_LIMIT` | `20` | Default `/search` result count |
| `TORRENT_CACHE_TTL_HOURS` | `24` | How long cached search results stay fresh |
| `OPENSUBTITLES_USERAGENT` | — | OpenSubtitles UA (required for `/subtitles`) |
| `OPENSUBTITLES_USERNAME` | — | OpenSubtitles account username |
| `OPENSUBTITLES_PASSWORD` | — | OpenSubtitles account password |

Subtitles are optional — the player works without them.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/movies` | Browse the local catalog (`query`, `category`, `sort`, `limit`, `page`, `type`) |
| GET | `/search` | Live torrent search (requires `TORRENT_PROVIDERS`) |
| GET | `/categories` | Available genres |
| GET | `/movie/:id` | Title details (movies and series) |
| GET | `/prepare/:id` | Start the torrent and return buffering progress |
| GET | `/stream/:id` | HTTP video stream with range requests |
| GET | `/subtitles/:id` | Fetch EN/FR subtitles, returns `.vtt` URLs |
| GET | `/subtitles-file/:filename` | Serve a generated `.vtt` file |
| POST | `/comment/:id` | Append a comment to a title |

Series-aware endpoints (`/prepare`, `/stream`, `/subtitles`) accept `?season=N&episode=N&quality=720p` query params.

### Rate limits

A global limiter (1500 req / 15 min per IP) is applied to every route, and a stricter limiter (30 req / min) guards `/search`, `/prepare/:id`, and `/subtitles/:id` — the endpoints that hit external APIs or spawn torrent sessions. The server is configured for `trust proxy: 1`, which assumes a single reverse-proxy hop (nginx). **If you run the server directly on the public internet without a proxy in front, edit `server/src/app.js` and remove that line — otherwise clients can spoof their IP via `X-Forwarded-For`.**

---

## Project structure

```
HYPERTUBE/
├── client/
│   ├── nginx.conf                   # SPA routing + same-origin API proxy
│   └── src/
│       ├── components/              # Index, Movies, MovieDetail, VideoPlayer, Header
│       ├── router/                  # Home, Browse, MovieDetail, Watch
│       └── services/                # Api, MoviesService, ProgressService
├── server/
│   ├── ecosystem.config.js          # PM2 configuration
│   └── src/
│       ├── app.js                   # Express bootstrap, middleware, Mongo connect
│       ├── routes.js                # /movies + /search wiring
│       ├── controllers/             # MovieController, SearchController
│       ├── routers/                 # /stream, /prepare, /subtitles, /movie, /comment
│       ├── services/                # TorrentSearchService, ImdbService, TorrentIngestionService
│       ├── middleware/              # rateLimit
│       ├── models/                  # Movie schema (movies + series + episodes)
│       ├── functions/               # HTTP range streaming
│       ├── config/                  # Config + indexer/seeder
│       └── __tests__/               # Jest
├── docker-compose.yml
└── .github/workflows/ci.yml         # server tests + client build on every PR
```

---

## Forking notes

If you fork this and put it on the public internet, you should know:

- **No authentication.** Anyone who can reach the server can stream and trigger torrent downloads. There used to be a login flow; it was removed. If you expose it beyond `localhost`, put it behind your own auth (oauth2-proxy, Authelia, basic auth via nginx, etc.).
- **Disk usage grows fast.** Streamed torrents are cached to `server/downloads/` (or the `server-downloads` Docker volume). Nothing prunes them.
- **The continuous indexer is unbounded.** If you set `SEARCH_QUERIES`, it will keep running forever, consuming both your OMDB quota and your bandwidth. Tune `TORRENT_CACHE_TTL_HOURS` and the queries themselves.
- **trust proxy is set to 1.** Assumes nginx in front. Drop it (or tighten it) if you're running the express server raw.
- **It's a single Mongo instance.** No replica set, no backups. Don't use the bundled compose for anything you'd cry over losing.

## Testing

```bash
cd server && npm test
```

CI (`.github/workflows/ci.yml`) runs server tests and a client build on every PR.

## License

MIT
