# Hypertube

A full-stack movie streaming application built with Vue.js and Node.js/Express, featuring torrent integration, subtitle support, and user authentication.

## Tech Stack

- **Frontend:** Vue 3, Vuetify 3, Vuex, Vue Router, Axios
- **Backend:** Node.js, Express 5, Mongoose/MongoDB, JWT
- **Build:** Webpack 5, Babel 7, Sass
- **DevOps:** Docker, GitHub Actions CI

## Prerequisites

- Node.js >= 14
- npm >= 6
- MongoDB instance (local or Atlas)

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

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MongoDB URI, JWT secret, and API keys. See `.env.example` for all required variables.

### 3. Run development servers

```bash
# Terminal 1 - Server (localhost:8081)
cd server && npm start

# Terminal 2 - Client (localhost:8080)
cd client && npm run dev
```

### 4. Run with Docker (optional)

```bash
docker-compose up --build
```

## Testing

```bash
cd server && npm test
```

## Project Structure

```
HYPERTUBE/
├── client/          # Vue.js frontend
│   ├── build/       # Webpack configuration
│   ├── src/         # Vue source (components, router, store, services)
│   └── Dockerfile
├── server/          # Express backend
│   ├── src/         # Controllers, models, routes, policies
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## License

MIT
