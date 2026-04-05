<template>
    <div class="browse-page">
        <!-- Search -->
        <div class="search-section" :class="{ 'search-active': searchActive }">
            <form @submit.prevent="searchTorrents" class="search-form">
                <Search :size="20" class="search-form-icon" />
                <input v-model="searchQuery" type="text" placeholder="Search movies, shows, anime..." class="search-form-input" @focus="searchActive = true" />
                <button v-if="searchQuery" type="button" class="search-clear" @click="clearSearch"><X :size="16" /></button>
            </form>
        </div>

        <!-- Search Results -->
        <div v-if="searchQuery && searchActive" class="content-section">
            <div v-if="searching" class="search-loading"><div class="spinner"></div><p>Searching torrents...</p></div>
            <div v-else-if="searchResults.length > 0">
                <h2 class="section-title">Results for "{{ searchQuery }}"</h2>
                <div class="content-grid">
                    <div v-for="movie in searchResults" :key="movie._id" class="movie-card" @click="goToMovie(movie)">
                        <img v-if="movie.cover" :src="movie.cover" :alt="movie.title" class="movie-poster" loading="lazy" />
                        <div v-else class="movie-poster-placeholder"><span>{{ movie.title }}</span></div>
                        <span v-if="movie.contentType === 'series'" class="type-tag">TV</span>
                        <span v-if="movie.rating" class="rating-badge"><Star :size="10" /> {{ movie.rating }}</span>
                        <div class="card-overlay">
                            <h3>{{ movie.title }}</h3>
                            <p>{{ movie.year }}<template v-if="movie.totalSeasons"> &middot; {{ movie.totalSeasons }} Seasons</template></p>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="searchDone" class="empty-state"><SearchX :size="60" color="#555" /><p>No results found</p></div>
        </div>

        <!-- Browse -->
        <template v-if="!searchActive || !searchQuery">
            <!-- Hero -->
            <div class="hero-banner" v-if="featuredMovie">
                <div class="hero-backdrop" :style="featuredMovie.cover ? { backgroundImage: `url(${featuredMovie.cover})` } : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }"></div>
                <div class="hero-gradient"></div>
                <div class="hero-info">
                    <span v-if="featuredMovie.contentType === 'series'" class="hero-type-badge">TV Series</span>
                    <h1>{{ featuredMovie.title }}</h1>
                    <p class="hero-meta">
                        <span v-if="featuredMovie.rating" class="match"><Star :size="14" /> {{ featuredMovie.rating }}</span>
                        <span v-if="featuredMovie.year">{{ featuredMovie.year }}</span>
                        <span v-if="featuredMovie.genres && featuredMovie.genres.length">{{ featuredMovie.genres.slice(0, 3).join(' / ') }}</span>
                    </p>
                    <p v-if="featuredMovie.summary" class="hero-summary">{{ truncate(featuredMovie.summary, 180) }}</p>
                    <div class="hero-actions">
                        <button class="btn-play" @click="playMovie(featuredMovie)"><Play :size="22" /> Play</button>
                        <button class="btn-info" @click="goToMovie(featuredMovie)"><Info :size="18" /> More Info</button>
                    </div>
                </div>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="loading-state">
                <div v-for="n in 3" :key="n" class="skeleton-row"><div class="skeleton-title"></div><div class="skeleton-cards"><div v-for="m in 6" :key="m" class="skeleton-card"></div></div></div>
            </div>

            <!-- Filtered Grid -->
            <div v-else-if="isFiltered" class="content-section">
                <h2 class="section-title">{{ pageTitle }}</h2>
                <div class="content-grid" v-if="uniqueMovies.length > 0">
                    <div v-for="movie in uniqueMovies" :key="movie._id" class="movie-card" @click="goToMovie(movie)">
                        <img v-if="movie.cover" :src="movie.cover" :alt="movie.title" class="movie-poster" loading="lazy" />
                        <div v-else class="movie-poster-placeholder"><span>{{ movie.title }}</span></div>
                        <span v-if="movie.contentType === 'series'" class="type-tag">TV</span>
                        <span v-if="movie.rating" class="rating-badge"><Star :size="10" /> {{ movie.rating }}</span>
                        <span v-if="movie.totalSeasons" class="seasons-badge">{{ movie.totalSeasons }} Seasons</span>
                        <div class="card-overlay">
                            <h3>{{ movie.title }}</h3>
                            <p>{{ movie.year }}<template v-if="movie.genres && movie.genres.length"> &middot; {{ movie.genres.slice(0, 2).join(', ') }}</template></p>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-state"><Film :size="60" color="#555" /><p>No content in this category yet.</p></div>
            </div>

            <!-- Home: Category Rows -->
            <div v-else class="browse-rows">
                <!-- Recently Added -->
                <div class="category-row" v-if="recentlyAdded.length > 0">
                    <h2 class="row-title"><Clock :size="18" /> Recently Added</h2>
                    <div class="row-container">
                        <button class="scroll-btn scroll-left" @click="scrollRow($event, -1)"><ChevronLeft :size="24" /></button>
                        <div class="row-movies">
                            <div v-for="movie in recentlyAdded" :key="'r-'+movie._id" class="movie-card" @click="goToMovie(movie)">
                                <img v-if="movie.cover" :src="movie.cover" :alt="movie.title" class="movie-poster" loading="lazy" />
                                <div v-else class="movie-poster-placeholder"><span>{{ movie.title }}</span></div>
                                <span v-if="movie.contentType === 'series'" class="type-tag">TV</span>
                                <span v-if="movie.rating" class="rating-badge"><Star :size="10" /> {{ movie.rating }}</span>
                                <div class="card-overlay"><h3>{{ movie.title }}</h3><p>{{ movie.year }}</p></div>
                            </div>
                        </div>
                        <button class="scroll-btn scroll-right" @click="scrollRow($event, 1)"><ChevronRight :size="24" /></button>
                    </div>
                </div>

                <!-- Trending -->
                <div class="category-row" v-if="trendingMovies.length > 0">
                    <h2 class="row-title"><TrendingUp :size="18" /> Trending</h2>
                    <div class="row-container">
                        <button class="scroll-btn scroll-left" @click="scrollRow($event, -1)"><ChevronLeft :size="24" /></button>
                        <div class="row-movies">
                            <div v-for="movie in trendingMovies" :key="'t-'+movie._id" class="movie-card" @click="goToMovie(movie)">
                                <img v-if="movie.cover" :src="movie.cover" :alt="movie.title" class="movie-poster" loading="lazy" />
                                <div v-else class="movie-poster-placeholder"><span>{{ movie.title }}</span></div>
                                <span v-if="movie.contentType === 'series'" class="type-tag">TV</span>
                                <span v-if="movie.rating" class="rating-badge"><Star :size="10" /> {{ movie.rating }}</span>
                                <div class="card-overlay"><h3>{{ movie.title }}</h3><p>{{ movie.year }}</p></div>
                            </div>
                        </div>
                        <button class="scroll-btn scroll-right" @click="scrollRow($event, 1)"><ChevronRight :size="24" /></button>
                    </div>
                </div>

                <!-- Genre rows -->
                <div v-for="(catMovies, category) in moviesByCategory" :key="category" class="category-row">
                    <h2 class="row-title">{{ category }}</h2>
                    <div class="row-container">
                        <button class="scroll-btn scroll-left" @click="scrollRow($event, -1)"><ChevronLeft :size="24" /></button>
                        <div class="row-movies">
                            <div v-for="movie in catMovies" :key="category+'-'+movie._id" class="movie-card" @click="goToMovie(movie)">
                                <img v-if="movie.cover" :src="movie.cover" :alt="movie.title" class="movie-poster" loading="lazy" />
                                <div v-else class="movie-poster-placeholder"><span>{{ movie.title }}</span></div>
                                <span v-if="movie.contentType === 'series'" class="type-tag">TV</span>
                                <span v-if="movie.rating" class="rating-badge"><Star :size="10" /> {{ movie.rating }}</span>
                                <div class="card-overlay"><h3>{{ movie.title }}</h3><p>{{ movie.year }}</p></div>
                            </div>
                        </div>
                        <button class="scroll-btn scroll-right" @click="scrollRow($event, 1)"><ChevronRight :size="24" /></button>
                    </div>
                </div>

                <div v-if="uniqueMovies.length === 0 && !loading" class="empty-state"><Film :size="80" color="#555" /><p>No content found.</p></div>
            </div>
        </template>
    </div>
</template>

<script>
import MoviesService from '@/services/MoviesService';
import { Search, X, SearchX, Play, Info, ChevronLeft, ChevronRight, Film, Star, TrendingUp, Clock } from 'lucide-vue-next';

export default {
    name: 'BrowsePage',
    components: { Search, X, SearchX, Play, Info, ChevronLeft, ChevronRight, Film, Star, TrendingUp, Clock },
    data() {
        return { movies: [], loading: true, featuredMovie: null, searchQuery: '', searchActive: false, searching: false, searchDone: false, searchResults: [] };
    },
    computed: {
        isFiltered() { return !!this.$route.query.type || !!this.$route.query.category; },
        pageTitle() {
            if (this.$route.query.type === 'movie') return 'Movies';
            if (this.$route.query.type === 'series') return 'TV Shows';
            if (this.$route.query.category) return this.$route.query.category;
            return 'Browse';
        },
        uniqueMovies() {
            const seen = new Set();
            return this.movies.filter(m => { const k = m.imdb_code || m._id; if (seen.has(k)) return false; seen.add(k); return true; });
        },
        recentlyAdded() {
            return [...this.uniqueMovies].filter(m => m.cover).sort((a, b) => new Date(b.lastSearched || 0) - new Date(a.lastSearched || 0)).slice(0, 20);
        },
        trendingMovies() {
            return [...this.uniqueMovies].filter(m => m.cover).sort((a, b) => (b.seeds || 0) - (a.seeds || 0)).slice(0, 20);
        },
        moviesByCategory() {
            const cats = {};
            this.uniqueMovies.forEach(movie => {
                if (!movie.genres?.length) return;
                movie.genres.forEach(g => {
                    const genre = g.trim();
                    if (!genre || genre.toLowerCase() === 'n/a') return;
                    if (!cats[genre]) cats[genre] = [];
                    if (cats[genre].length < 20) cats[genre].push(movie);
                });
            });
            return Object.fromEntries(Object.entries(cats).filter(([, v]) => v.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 8));
        },
    },
    async mounted() {
        if (this.$route.query.q) { this.searchQuery = this.$route.query.q; this.searchActive = true; await this.searchTorrents(); }
        await this.fetchMovies();
    },
    watch: {
        '$route.query.q'(q) { if (q) { this.searchQuery = q; this.searchActive = true; this.searchTorrents(); } },
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
                const enriched = this.uniqueMovies.filter(m => m.cover && m.summary);
                if (enriched.length > 0) {
                    const sorted = enriched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    this.featuredMovie = sorted[Math.floor(Math.random() * Math.min(sorted.length, 5))];
                } else if (this.uniqueMovies.length > 0) {
                    this.featuredMovie = [...this.uniqueMovies].sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
                }
            } catch (err) { console.error(err); }
            finally { this.loading = false; }
        },
        async searchTorrents() {
            if (!this.searchQuery.trim() || this.searchQuery.trim().length < 2) return;
            this.searching = true; this.searchDone = false; this.searchResults = [];
            try { const r = await MoviesService.Search({ query: this.searchQuery.trim(), limit: 40 }); this.searchResults = r.data.results || []; }
            catch (err) { console.error(err); }
            finally { this.searching = false; this.searchDone = true; }
        },
        clearSearch() { this.searchQuery = ''; this.searchActive = false; this.searchResults = []; this.searchDone = false; },
        goToMovie(m) { this.$router.push({ name: 'MovieDetail', params: { id: m._id } }); },
        playMovie(m) { this.$router.push({ name: 'Watch', params: { id: m._id } }); },
        truncate(t, l) { return !t ? '' : t.length > l ? t.substring(0, l) + '...' : t; },
        scrollRow(e, d) { const c = e.target.closest('.row-container').querySelector('.row-movies'); c.scrollBy({ left: d * c.clientWidth * 0.75, behavior: 'smooth' }); },
    },
};
</script>

<style scoped>
.browse-page { background: #141414; min-height: 100vh; padding-bottom: 60px; }

.search-section { position: sticky; top: 68px; z-index: 50; padding: 16px 4%; }
.search-section.search-active { background: #141414; }
.search-form { display: flex; align-items: center; background: #222; border-radius: 4px; padding: 0 16px; max-width: 600px; }
.search-form-icon { color: #666; flex-shrink: 0; }
.search-form-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 1rem; padding: 13px 12px; }
.search-form-input::placeholder { color: #555; }
.search-clear { background: none; border: none; color: #999; cursor: pointer; display: flex; }
.search-loading { display: flex; flex-direction: column; align-items: center; padding: 80px 0; gap: 16px; color: #888; }
.spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.content-section { padding: 20px 4%; }
.section-title { color: #fff; font-size: 1.4rem; font-weight: 700; margin-bottom: 20px; }
.content-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 14px; }

/* Hero */
.hero-banner { position: relative; height: 65vh; min-height: 380px; display: flex; align-items: flex-end; padding: 0 4% 5%; }
.hero-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center top; }
.hero-gradient { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(20,20,20,0.3) 0%, rgba(20,20,20,0.6) 50%, #141414 100%); }
.hero-info { position: relative; z-index: 2; max-width: 520px; }
.hero-type-badge { display: inline-block; background: #6366f1; color: #fff; padding: 3px 10px; border-radius: 3px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
.hero-info h1 { font-size: 2.6rem; font-weight: 900; color: #fff; margin: 0 0 10px; text-shadow: 0 2px 12px rgba(0,0,0,0.5); }
.hero-meta { display: flex; gap: 10px; color: #bbb; font-size: 0.88rem; margin-bottom: 10px; flex-wrap: wrap; }
.match { color: #f5c518; font-weight: 700; display: flex; align-items: center; gap: 3px; }
.hero-summary { color: #bbb; font-size: 0.9rem; line-height: 1.5; margin-bottom: 18px; }
.hero-actions { display: flex; gap: 10px; }
.btn-play { display: inline-flex; align-items: center; gap: 7px; background: #fff; color: #000; border: none; border-radius: 4px; padding: 10px 26px; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.btn-play:hover { opacity: 0.85; }
.btn-info { display: inline-flex; align-items: center; gap: 7px; background: rgba(109,109,110,0.7); color: #fff; border: none; border-radius: 4px; padding: 10px 26px; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.btn-info:hover { background: rgba(109,109,110,0.4); }

/* Rows */
.browse-rows { position: relative; z-index: 3; padding-top: 16px; }
.category-row { margin-bottom: 28px; padding: 0 4%; }
.row-title { color: #e5e5e5; font-size: 1.15rem; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.row-container { position: relative; }
.row-movies { display: flex; gap: 10px; overflow-x: auto; scroll-behavior: smooth; padding: 4px 0 16px; scrollbar-width: none; }
.row-movies::-webkit-scrollbar { display: none; }
.scroll-btn { position: absolute; top: 0; bottom: 16px; width: 42px; z-index: 10; background: rgba(20,20,20,0.85); border: none; color: #fff; cursor: pointer; opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; }
.row-container:hover .scroll-btn { opacity: 1; }
.scroll-left { left: 0; border-radius: 0 4px 4px 0; }
.scroll-right { right: 0; border-radius: 4px 0 0 4px; }

/* Card */
.movie-card { flex: 0 0 165px; height: 248px; border-radius: 6px; overflow: hidden; cursor: pointer; position: relative; background: #1a1a1a; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.movie-card:hover { transform: translateY(-6px); box-shadow: 0 10px 24px rgba(0,0,0,0.5); }
.movie-poster { width: 100%; height: 100%; object-fit: cover; }
.movie-poster-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 14px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
.movie-poster-placeholder span { color: #555; font-size: 0.72rem; text-align: center; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.type-tag { position: absolute; top: 7px; left: 7px; background: #6366f1; color: #fff; font-size: 0.58rem; font-weight: 800; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; z-index: 5; }
.rating-badge { position: absolute; top: 7px; right: 7px; background: rgba(0,0,0,0.75); color: #f5c518; font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 3px; display: flex; align-items: center; gap: 2px; z-index: 5; }
.seasons-badge { position: absolute; bottom: 40px; left: 7px; background: rgba(0,0,0,0.7); color: #ccc; font-size: 0.62rem; padding: 2px 6px; border-radius: 2px; z-index: 5; }
.card-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%); padding: 44px 9px 9px; opacity: 0; transition: opacity 0.25s; }
.movie-card:hover .card-overlay { opacity: 1; }
.card-overlay h3 { color: #fff; font-size: 0.78rem; font-weight: 700; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-overlay p { color: #999; font-size: 0.68rem; margin: 0; }

.loading-state { padding: 40px 4%; }
.skeleton-row { margin-bottom: 36px; }
.skeleton-title { width: 140px; height: 18px; background: #222; border-radius: 4px; margin-bottom: 10px; }
.skeleton-cards { display: flex; gap: 10px; }
.skeleton-card { flex: 0 0 165px; height: 248px; background: #222; border-radius: 6px; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.empty-state { text-align: center; padding: 100px 24px; color: #555; }
.empty-state p { margin-top: 14px; font-size: 1rem; }
.content-grid .movie-card { flex: none; width: 100%; }

@media (max-width: 768px) {
    .hero-banner { height: 50vh; min-height: 280px; }
    .hero-info h1 { font-size: 1.7rem; }
    .movie-card { flex: 0 0 125px; height: 188px; }
    .content-grid { grid-template-columns: repeat(auto-fill, minmax(125px, 1fr)); gap: 8px; }
}
</style>
