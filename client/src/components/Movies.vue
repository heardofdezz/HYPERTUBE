<template>
    <div class="browse-page">
        <!-- Search Overlay -->
        <div class="search-section" :class="{ 'search-active': searchActive }">
            <form @submit.prevent="searchTorrents" class="search-form">
                <Search :size="20" class="search-form-icon" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search movies, shows..."
                    class="search-form-input"
                    @focus="searchActive = true"
                />
                <button v-if="searchQuery" type="button" class="search-clear" @click="clearSearch">
                    <X :size="16" />
                </button>
            </form>
        </div>

        <!-- Search Results -->
        <div v-if="searchQuery && searchActive" class="search-results-section">
            <div v-if="searching" class="search-loading">
                <div class="spinner"></div>
                <p>Searching torrents across providers...</p>
            </div>
            <div v-else-if="searchResults.length > 0" class="search-results-grid">
                <h2 class="results-title">Results for "{{ searchQuery }}"</h2>
                <div class="results-grid">
                    <div
                        class="movie-card"
                        v-for="movie in searchResults"
                        :key="movie._id"
                        @click="goToMovie(movie)"
                    >
                        <img
                            :src="movie.cover || 'https://via.placeholder.com/200x300/141414/666?text=No+Poster'"
                            :alt="movie.title"
                            class="movie-poster"
                            loading="lazy"
                        />
                        <div class="card-hover">
                            <h3 class="card-title">{{ movie.title }}</h3>
                            <div class="card-meta">
                                <span v-if="movie.seeds" class="card-seeds">
                                    <ArrowUp :size="12" />
                                    {{ movie.seeds }}
                                </span>
                                <span v-if="movie.rating" class="card-match">{{ Math.round(movie.rating * 10) }}%</span>
                                <span v-if="movie.year">{{ movie.year }}</span>
                                <span v-if="movie.provider" class="card-provider">{{ movie.provider }}</span>
                            </div>
                            <div class="card-genres" v-if="movie.genres && movie.genres.length">
                                <span v-for="(genre, i) in movie.genres.slice(0, 3)" :key="i">{{ genre }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="searchDone" class="empty-state">
                <SearchX :size="60" color="#555" />
                <p>No results found for "{{ searchQuery }}"</p>
            </div>
        </div>

        <!-- Browse Content (hidden during search) -->
        <template v-if="!searchActive || !searchQuery">
            <!-- Hero Banner -->
            <div class="hero-banner" v-if="featuredMovie">
                <div class="hero-backdrop" :style="{ backgroundImage: `url(${featuredMovie.cover})` }"></div>
                <div class="hero-gradient"></div>
                <div class="hero-info">
                    <h1 class="hero-movie-title">{{ featuredMovie.title }}</h1>
                    <p class="hero-movie-meta">
                        <span class="match">{{ Math.round((featuredMovie.rating || 7) * 10) }}% Match</span>
                        <span>{{ featuredMovie.year }}</span>
                        <span v-if="featuredMovie.runtime">{{ featuredMovie.runtime }}</span>
                    </p>
                    <p class="hero-movie-summary">{{ truncate(featuredMovie.summary, 200) }}</p>
                    <div class="hero-actions">
                        <button class="btn-play" @click="goToMovie(featuredMovie)">
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

            <!-- Category Rows -->
            <div class="browse-rows" v-else>
                <div
                    class="category-row"
                    v-for="(movies, category) in moviesByCategory"
                    :key="category"
                >
                    <h2 class="row-title">{{ category }}</h2>
                    <div class="row-container">
                        <button class="scroll-btn scroll-left" @click="scrollRow($event, -1)">
                            <ChevronLeft :size="24" />
                        </button>
                        <div class="row-movies">
                            <div
                                class="movie-card"
                                v-for="movie in movies"
                                :key="movie._id"
                                @click="goToMovie(movie)"
                            >
                                <img
                                    :src="movie.cover || 'https://via.placeholder.com/200x300/141414/666?text=No+Poster'"
                                    :alt="movie.title"
                                    class="movie-poster"
                                    loading="lazy"
                                />
                                <div class="card-hover">
                                    <h3 class="card-title">{{ movie.title }}</h3>
                                    <div class="card-meta">
                                        <span class="card-match">{{ Math.round((movie.rating || 5) * 10) }}%</span>
                                        <span>{{ movie.year }}</span>
                                    </div>
                                    <div class="card-genres">
                                        <span v-for="(genre, i) in (movie.genres || []).slice(0, 3)" :key="i">
                                            {{ genre }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="scroll-btn scroll-right" @click="scrollRow($event, 1)">
                            <ChevronRight :size="24" />
                        </button>
                    </div>
                </div>

                <div v-if="Object.keys(moviesByCategory).length === 0" class="empty-state">
                    <Film :size="80" color="#555" />
                    <p>No movies found. Try searching for something!</p>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import MoviesService from '@/services/MoviesService';
import { Search, X, SearchX, Play, Info, ChevronLeft, ChevronRight, ArrowUp, Film } from 'lucide-vue-next';

export default {
    name: 'BrowsePage',
    components: { Search, X, SearchX, Play, Info, ChevronLeft, ChevronRight, ArrowUp, Film },
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
        moviesByCategory() {
            const cats = {};
            this.movies.forEach((movie) => {
                if (movie.genres && movie.genres.length > 0) {
                    movie.genres.forEach((genre) => {
                        const g = genre.trim();
                        if (g && g.toLowerCase() !== 'n/a') {
                            if (!cats[g]) cats[g] = [];
                            if (cats[g].length < 20) {
                                cats[g].push(movie);
                            }
                        }
                    });
                }
            });
            const sorted = Object.entries(cats)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 10);
            const result = {};
            sorted.forEach(([key, val]) => {
                result[key] = val;
            });
            return result;
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
            if (newQ) {
                this.searchQuery = newQ;
                this.searchActive = true;
                this.searchTorrents();
            }
        },
    },
    methods: {
        async fetchMovies() {
            this.loading = true;
            try {
                const response = await MoviesService.MoviesIndex({ limit: 100 });
                this.movies = response.data || [];
                if (this.movies.length > 0) {
                    const rated = this.movies
                        .filter((m) => m.cover && m.summary && m.rating >= 6)
                        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    this.featuredMovie = rated.length > 0
                        ? rated[Math.floor(Math.random() * Math.min(rated.length, 10))]
                        : this.movies[0];
                }
            } catch (err) {
                console.error('Failed to fetch movies:', err);
            } finally {
                this.loading = false;
            }
        },
        async searchTorrents() {
            if (!this.searchQuery.trim() || this.searchQuery.trim().length < 2) return;
            this.searching = true;
            this.searchDone = false;
            this.searchResults = [];
            try {
                const response = await MoviesService.Search({
                    query: this.searchQuery.trim(),
                    limit: 40,
                });
                this.searchResults = response.data.results || [];
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                this.searching = false;
                this.searchDone = true;
            }
        },
        clearSearch() {
            this.searchQuery = '';
            this.searchActive = false;
            this.searchResults = [];
            this.searchDone = false;
        },
        goToMovie(movie) {
            this.$router.push({ name: 'MovieDetail', params: { id: movie._id } });
        },
        truncate(text, len) {
            if (!text) return '';
            return text.length > len ? text.substring(0, len) + '...' : text;
        },
        scrollRow(event, direction) {
            const container = event.target.closest('.row-container');
            const rowMovies = container.querySelector('.row-movies');
            const scrollAmount = rowMovies.clientWidth * 0.75;
            rowMovies.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        },
    },
};
</script>

<style scoped>
.browse-page { background: #141414; min-height: 100vh; padding-bottom: 60px; }

.search-section { position: sticky; top: 68px; z-index: 50; padding: 16px 4%; transition: background 0.3s; }
.search-section.search-active { background: #141414; }
.search-form { display: flex; align-items: center; background: #333; border-radius: 4px; padding: 0 16px; max-width: 600px; }
.search-form-icon { color: #999; flex-shrink: 0; }
.search-form-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 1rem; padding: 14px 12px; }
.search-form-input::placeholder { color: #777; }
.search-clear { background: none; border: none; color: #999; cursor: pointer; padding: 4px; display: flex; }

.search-results-section { padding: 20px 4%; min-height: 60vh; }
.search-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 16px; }
.search-loading p { color: #888; font-size: 0.95rem; }
.spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.results-title { color: #e5e5e5; font-size: 1.3rem; font-weight: 700; margin-bottom: 20px; }
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }

.hero-banner { position: relative; height: 80vh; min-height: 500px; display: flex; align-items: flex-end; padding: 0 4% 8%; }
.hero-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center top; filter: brightness(0.5); }
.hero-gradient { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 0%, rgba(20,20,20,0.4) 50%, #141414 100%); }
.hero-info { position: relative; z-index: 2; max-width: 550px; }
.hero-movie-title { font-size: 3rem; font-weight: 900; color: #fff; margin-bottom: 12px; text-shadow: 2px 2px 8px rgba(0,0,0,0.6); }
.hero-movie-meta { display: flex; gap: 12px; align-items: center; color: #ddd; font-size: 0.95rem; margin-bottom: 12px; }
.match { color: #46d369; font-weight: 700; }
.hero-movie-summary { color: #ddd; font-size: 1rem; line-height: 1.5; margin-bottom: 24px; text-shadow: 1px 1px 4px rgba(0,0,0,0.5); }
.hero-actions { display: flex; gap: 12px; }
.btn-play { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #000; border: none; border-radius: 4px; padding: 10px 28px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-play:hover { opacity: 0.8; }
.btn-info { display: inline-flex; align-items: center; gap: 8px; background: rgba(109,109,110,0.7); color: #fff; border: none; border-radius: 4px; padding: 10px 28px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-info:hover { background: rgba(109,109,110,0.4); }

.browse-rows { margin-top: -80px; position: relative; z-index: 3; }
.category-row { margin-bottom: 40px; padding: 0 4%; }
.row-title { color: #e5e5e5; font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; }
.row-container { position: relative; }
.row-movies { display: flex; gap: 8px; overflow-x: auto; scroll-behavior: smooth; padding: 8px 0 24px; -ms-overflow-style: none; scrollbar-width: none; }
.row-movies::-webkit-scrollbar { display: none; }

.scroll-btn { position: absolute; top: 0; bottom: 24px; width: 48px; z-index: 10; background: rgba(20,20,20,0.7); border: none; color: #fff; cursor: pointer; opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; }
.row-container:hover .scroll-btn { opacity: 1; }
.scroll-left { left: 0; border-radius: 0 4px 4px 0; }
.scroll-right { right: 0; border-radius: 4px 0 0 4px; }

.movie-card { flex: 0 0 200px; height: 300px; border-radius: 4px; overflow: hidden; cursor: pointer; position: relative; transition: transform 0.3s ease, z-index 0s 0.3s; }
.movie-card:hover { transform: scale(1.3); z-index: 20; transition: transform 0.3s ease, z-index 0s; }
.movie-poster { width: 100%; height: 100%; object-fit: cover; }
.card-hover { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, #181818 0%, transparent 100%); padding: 60px 12px 12px; opacity: 0; transition: opacity 0.3s; }
.movie-card:hover .card-hover { opacity: 1; }
.card-title { color: #fff; font-size: 0.85rem; font-weight: 700; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { display: flex; gap: 8px; font-size: 0.75rem; color: #aaa; margin-bottom: 4px; align-items: center; }
.card-match { color: #46d369; font-weight: 700; }
.card-seeds { color: #46d369; display: flex; align-items: center; gap: 2px; }
.card-provider { color: #888; text-transform: capitalize; }
.card-genres { display: flex; gap: 6px; flex-wrap: wrap; }
.card-genres span { font-size: 0.65rem; color: #ddd; border: 1px solid #444; padding: 1px 6px; border-radius: 2px; }

.loading-state { padding: 40px 4%; }
.skeleton-row { margin-bottom: 40px; }
.skeleton-title { width: 150px; height: 20px; background: #222; border-radius: 4px; margin-bottom: 12px; }
.skeleton-cards { display: flex; gap: 8px; }
.skeleton-card { flex: 0 0 200px; height: 300px; background: #222; border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.empty-state { text-align: center; padding: 120px 24px; color: #666; }
.empty-state p { margin-top: 16px; font-size: 1.1rem; }
.results-grid .movie-card { flex: none; width: 100%; height: 300px; }

@media (max-width: 768px) {
    .hero-banner { height: 60vh; min-height: 400px; }
    .hero-movie-title { font-size: 1.8rem; }
    .movie-card { flex: 0 0 140px; height: 210px; }
    .movie-card:hover { transform: scale(1.1); }
    .results-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}
</style>
