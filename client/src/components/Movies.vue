<template>
    <div class="browse-page">
        <!-- Search Bar -->
        <div class="search-section" :class="{ 'search-active': searchActive }">
            <form @submit.prevent="searchTorrents" class="search-form">
                <Search :size="20" class="search-form-icon" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search movies, shows, anime..."
                    class="search-form-input"
                    @focus="searchActive = true"
                />
                <button v-if="searchQuery" type="button" class="search-clear" @click="clearSearch">
                    <X :size="16" />
                </button>
            </form>
        </div>

        <!-- Search Results -->
        <div v-if="searchQuery && searchActive" class="content-section">
            <div v-if="searching" class="search-loading">
                <div class="spinner"></div>
                <p>Searching torrents across providers...</p>
            </div>
            <div v-else-if="searchResults.length > 0">
                <h2 class="section-title">Results for "{{ searchQuery }}"</h2>
                <div class="content-grid">
                    <MovieCard
                        v-for="movie in searchResults"
                        :key="movie._id"
                        :movie="movie"
                        @click="goToMovie(movie)"
                    />
                </div>
            </div>
            <div v-else-if="searchDone" class="empty-state">
                <SearchX :size="60" color="#555" />
                <p>No results found for "{{ searchQuery }}"</p>
            </div>
        </div>

        <!-- Browse Content -->
        <template v-if="!searchActive || !searchQuery">
            <!-- Hero Banner -->
            <div class="hero-banner" v-if="featuredMovie">
                <div class="hero-backdrop" :style="featuredMovie.cover ? { backgroundImage: `url(${featuredMovie.cover})` } : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }"></div>
                <div class="hero-gradient"></div>
                <div class="hero-info">
                    <span v-if="featuredMovie.contentType === 'series'" class="hero-type-badge">TV Series</span>
                    <h1 class="hero-movie-title">{{ featuredMovie.title }}</h1>
                    <p class="hero-movie-meta">
                        <span v-if="featuredMovie.rating" class="match">
                            <Star :size="14" /> {{ featuredMovie.rating }}
                        </span>
                        <span v-if="featuredMovie.year">{{ featuredMovie.year }}</span>
                        <span v-if="featuredMovie.runtime">{{ featuredMovie.runtime }}</span>
                        <span v-if="featuredMovie.genres && featuredMovie.genres.length" class="hero-genres">
                            {{ featuredMovie.genres.slice(0, 3).join(' / ') }}
                        </span>
                    </p>
                    <p v-if="featuredMovie.summary" class="hero-movie-summary">{{ truncate(featuredMovie.summary, 200) }}</p>
                    <div class="hero-actions">
                        <button class="btn-play" @click="playMovie(featuredMovie)">
                            <Play :size="22" /> Play
                        </button>
                        <button class="btn-info" @click="goToMovie(featuredMovie)">
                            <Info :size="18" /> More Info
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
                <div class="skeleton-row" v-for="n in 3" :key="n">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-cards">
                        <div class="skeleton-card" v-for="m in 6" :key="m"></div>
                    </div>
                </div>
            </div>

            <!-- Filtered View (Movies, TV Shows, or Anime — grid layout) -->
            <div v-else-if="isFiltered" class="content-section">
                <h2 class="section-title">{{ pageTitle }}</h2>
                <div class="content-grid" v-if="uniqueMovies.length > 0">
                    <MovieCard
                        v-for="movie in uniqueMovies"
                        :key="movie._id"
                        :movie="movie"
                        @click="goToMovie(movie)"
                    />
                </div>
                <div v-else class="empty-state">
                    <Film :size="60" color="#555" />
                    <p>No content found in this category yet.</p>
                </div>
            </div>

            <!-- Home View (category rows) -->
            <div v-else class="browse-rows">
                <!-- Trending -->
                <div class="category-row" v-if="trendingMovies.length > 0">
                    <h2 class="row-title"><TrendingUp :size="18" /> Trending Now</h2>
                    <div class="row-container">
                        <button class="scroll-btn scroll-left" @click="scrollRow($event, -1)"><ChevronLeft :size="24" /></button>
                        <div class="row-movies">
                            <MovieCard v-for="movie in trendingMovies" :key="'t-'+movie._id" :movie="movie" @click="goToMovie(movie)" />
                        </div>
                        <button class="scroll-btn scroll-right" @click="scrollRow($event, 1)"><ChevronRight :size="24" /></button>
                    </div>
                </div>

                <!-- Genre Rows -->
                <div
                    class="category-row"
                    v-for="(catMovies, category) in moviesByCategory"
                    :key="category"
                >
                    <h2 class="row-title">{{ category }}</h2>
                    <div class="row-container">
                        <button class="scroll-btn scroll-left" @click="scrollRow($event, -1)"><ChevronLeft :size="24" /></button>
                        <div class="row-movies">
                            <MovieCard v-for="movie in catMovies" :key="category+'-'+movie._id" :movie="movie" @click="goToMovie(movie)" />
                        </div>
                        <button class="scroll-btn scroll-right" @click="scrollRow($event, 1)"><ChevronRight :size="24" /></button>
                    </div>
                </div>

                <div v-if="uniqueMovies.length === 0" class="empty-state">
                    <Film :size="80" color="#555" />
                    <p>No movies found. Try searching for something!</p>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import MoviesService from '@/services/MoviesService';
import { Search, X, SearchX, Play, Info, ChevronLeft, ChevronRight, ArrowUp, Film, Star, TrendingUp } from 'lucide-vue-next';

const MovieCard = {
    props: ['movie'],
    template: `
        <div class="movie-card" @click="$emit('click')">
            <img v-if="movie.cover" :src="movie.cover" :alt="movie.title" class="movie-poster" loading="lazy" />
            <div v-else class="movie-poster-placeholder">
                <span class="placeholder-title">{{ movie.title }}</span>
            </div>
            <span v-if="movie.contentType === 'series'" class="type-tag series-tag">TV</span>
            <span v-if="movie.rating" class="rating-badge">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="#f5c518"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {{ movie.rating }}
            </span>
            <div class="card-overlay">
                <h3 class="card-title">{{ movie.title }}</h3>
                <div class="card-meta">
                    <span v-if="movie.year">{{ movie.year }}</span>
                    <span v-if="movie.genres && movie.genres.length">{{ movie.genres.slice(0, 2).join(', ') }}</span>
                </div>
            </div>
        </div>
    `,
};

export default {
    name: 'BrowsePage',
    components: { Search, X, SearchX, Play, Info, ChevronLeft, ChevronRight, ArrowUp, Film, Star, TrendingUp, MovieCard },
    data() {
        return {
            movies: [],
            loading: true,
            featuredMovie: null,
            searchQuery: '',
            searchActive: false,
            searching: false,
            searchDone: false,
            searchResults: [],
        };
    },
    computed: {
        isFiltered() {
            return !!this.$route.query.type || !!this.$route.query.category;
        },
        pageTitle() {
            const type = this.$route.query.type;
            const category = this.$route.query.category;
            if (type === 'movie') return 'Movies';
            if (type === 'series') return 'TV Shows';
            if (category) return category;
            return 'Browse';
        },
        // Deduplicated movie list — one entry per imdb_code or _id
        uniqueMovies() {
            const seen = new Set();
            return this.movies.filter((m) => {
                const key = m.imdb_code || m._id;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },
        trendingMovies() {
            return [...this.uniqueMovies]
                .filter(m => m.cover)
                .sort((a, b) => (b.seeds || 0) - (a.seeds || 0))
                .slice(0, 20);
        },
        moviesByCategory() {
            const cats = {};
            const seen = {};

            this.uniqueMovies.forEach((movie) => {
                if (!movie.genres || movie.genres.length === 0) return;
                movie.genres.forEach((genre) => {
                    const g = genre.trim();
                    if (!g || g.toLowerCase() === 'n/a') return;
                    if (!cats[g]) { cats[g] = []; seen[g] = new Set(); }
                    if (cats[g].length < 20 && !seen[g].has(movie._id)) {
                        seen[g].add(movie._id);
                        cats[g].push(movie);
                    }
                });
            });

            return Object.fromEntries(
                Object.entries(cats)
                    .filter(([, v]) => v.length >= 3)
                    .sort((a, b) => b[1].length - a[1].length)
                    .slice(0, 10)
            );
        },
    },
    async mounted() {
        if (this.$route.query.q) {
            this.searchQuery = this.$route.query.q;
            this.searchActive = true;
            await this.searchTorrents();
        }
        await this.fetchMovies();
    },
    watch: {
        '$route.query.q'(newQ) {
            if (newQ) { this.searchQuery = newQ; this.searchActive = true; this.searchTorrents(); }
        },
        '$route.query.category'() { this.fetchMovies(); },
        '$route.query.type'() { this.fetchMovies(); },
    },
    methods: {
        async fetchMovies() {
            this.loading = true;
            try {
                const params = { limit: 100 };
                if (this.$route.query.category) params.category = this.$route.query.category;
                if (this.$route.query.type) params.type = this.$route.query.type;
                const response = await MoviesService.MoviesIndex(params);
                this.movies = response.data || [];
                if (this.uniqueMovies.length > 0) {
                    const enriched = this.uniqueMovies.filter((m) => m.cover && m.summary);
                    if (enriched.length > 0) {
                        const sorted = enriched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                        this.featuredMovie = sorted[Math.floor(Math.random() * Math.min(sorted.length, 5))];
                    } else {
                        this.featuredMovie = [...this.uniqueMovies].sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
                    }
                }
            } catch (err) {
                console.error('Failed to fetch movies:', err);
            } finally {
                this.loading = false;
            }
        },
        async searchTorrents() {
            if (!this.searchQuery.trim() || this.searchQuery.trim().length < 2) return;
            this.searching = true; this.searchDone = false; this.searchResults = [];
            try {
                const response = await MoviesService.Search({ query: this.searchQuery.trim(), limit: 40 });
                this.searchResults = response.data.results || [];
            } catch (err) { console.error('Search failed:', err); }
            finally { this.searching = false; this.searchDone = true; }
        },
        clearSearch() { this.searchQuery = ''; this.searchActive = false; this.searchResults = []; this.searchDone = false; },
        goToMovie(movie) { this.$router.push({ name: 'MovieDetail', params: { id: movie._id } }); },
        playMovie(movie) { this.$router.push({ name: 'Watch', params: { id: movie._id } }); },
        truncate(text, len) { if (!text) return ''; return text.length > len ? text.substring(0, len) + '...' : text; },
        scrollRow(event, direction) {
            const container = event.target.closest('.row-container');
            const rowMovies = container.querySelector('.row-movies');
            rowMovies.scrollBy({ left: direction * rowMovies.clientWidth * 0.75, behavior: 'smooth' });
        },
    },
};
</script>

<style scoped>
.browse-page { background: #141414; min-height: 100vh; padding-bottom: 60px; }

/* Search */
.search-section { position: sticky; top: 68px; z-index: 50; padding: 16px 4%; transition: background 0.3s; }
.search-section.search-active { background: #141414; }
.search-form { display: flex; align-items: center; background: #222; border-radius: 4px; padding: 0 16px; max-width: 600px; }
.search-form-icon { color: #666; flex-shrink: 0; }
.search-form-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 1rem; padding: 14px 12px; }
.search-form-input::placeholder { color: #555; }
.search-clear { background: none; border: none; color: #999; cursor: pointer; padding: 4px; display: flex; }

.search-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 16px; }
.search-loading p { color: #888; font-size: 0.95rem; }
.spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Content Section (grid view for filtered pages) */
.content-section { padding: 20px 4%; }
.section-title { color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; }
.content-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }

/* Hero Banner */
.hero-banner { position: relative; height: 70vh; min-height: 400px; display: flex; align-items: flex-end; padding: 0 4% 6%; }
.hero-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center top; }
.hero-gradient { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(20,20,20,0.3) 0%, rgba(20,20,20,0.6) 50%, #141414 100%); }
.hero-info { position: relative; z-index: 2; max-width: 550px; }
.hero-type-badge { display: inline-block; background: #E50914; color: #fff; padding: 3px 10px; border-radius: 3px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
.hero-movie-title { font-size: 2.8rem; font-weight: 900; color: #fff; margin-bottom: 12px; text-shadow: 2px 2px 8px rgba(0,0,0,0.6); }
.hero-movie-meta { display: flex; gap: 12px; align-items: center; color: #ddd; font-size: 0.9rem; margin-bottom: 12px; flex-wrap: wrap; }
.match { color: #f5c518; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.hero-genres { color: #aaa; }
.hero-movie-summary { color: #ccc; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; }
.hero-actions { display: flex; gap: 12px; }
.btn-play { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #000; border: none; border-radius: 4px; padding: 10px 28px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-play:hover { opacity: 0.8; }
.btn-info { display: inline-flex; align-items: center; gap: 8px; background: rgba(109,109,110,0.7); color: #fff; border: none; border-radius: 4px; padding: 10px 28px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-info:hover { background: rgba(109,109,110,0.4); }

/* Category Rows */
.browse-rows { position: relative; z-index: 3; padding-top: 20px; }
.category-row { margin-bottom: 32px; padding: 0 4%; }
.row-title { color: #e5e5e5; font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.row-container { position: relative; }
.row-movies { display: flex; gap: 10px; overflow-x: auto; scroll-behavior: smooth; padding: 4px 0 20px; -ms-overflow-style: none; scrollbar-width: none; }
.row-movies::-webkit-scrollbar { display: none; }
.scroll-btn { position: absolute; top: 0; bottom: 20px; width: 44px; z-index: 10; background: rgba(20,20,20,0.8); border: none; color: #fff; cursor: pointer; opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; }
.row-container:hover .scroll-btn { opacity: 1; }
.scroll-left { left: 0; border-radius: 0 4px 4px 0; }
.scroll-right { right: 0; border-radius: 4px 0 0 4px; }

/* Movie Card */
.movie-card { flex: 0 0 170px; height: 255px; border-radius: 6px; overflow: hidden; cursor: pointer; position: relative; background: #1a1a1a; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.movie-card:hover { transform: translateY(-8px); box-shadow: 0 12px 28px rgba(0,0,0,0.6); }
.movie-poster { width: 100%; height: 100%; object-fit: cover; }
.movie-poster-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 16px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
.placeholder-title { color: #555; font-size: 0.75rem; text-align: center; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

/* Card badges */
.type-tag { position: absolute; top: 8px; left: 8px; padding: 2px 7px; border-radius: 3px; font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; z-index: 5; }
.series-tag { background: #6366f1; color: #fff; }
.rating-badge { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.75); color: #f5c518; font-size: 0.7rem; font-weight: 700; padding: 3px 7px; border-radius: 3px; display: flex; align-items: center; gap: 3px; z-index: 5; }

/* Card overlay on hover */
.card-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%); padding: 50px 10px 10px; opacity: 0; transition: opacity 0.25s; }
.movie-card:hover .card-overlay { opacity: 1; }
.card-title { color: #fff; font-size: 0.8rem; font-weight: 700; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { display: flex; gap: 6px; font-size: 0.7rem; color: #999; }

/* Loading */
.loading-state { padding: 40px 4%; }
.skeleton-row { margin-bottom: 40px; }
.skeleton-title { width: 150px; height: 20px; background: #222; border-radius: 4px; margin-bottom: 12px; }
.skeleton-cards { display: flex; gap: 10px; }
.skeleton-card { flex: 0 0 170px; height: 255px; background: #222; border-radius: 6px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.empty-state { text-align: center; padding: 100px 24px; color: #666; }
.empty-state p { margin-top: 16px; font-size: 1.1rem; }

/* Grid cards */
.content-grid .movie-card { flex: none; width: 100%; height: 255px; }

@media (max-width: 768px) {
    .hero-banner { height: 50vh; min-height: 300px; }
    .hero-movie-title { font-size: 1.8rem; }
    .movie-card { flex: 0 0 130px; height: 195px; }
    .content-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
}
</style>
