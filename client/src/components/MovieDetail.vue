<template>
    <div class="detail-page">
        <div v-if="loading" class="detail-loading">
            <div class="spinner"></div>
        </div>

        <template v-else-if="movie">
            <div class="detail-hero">
                <div class="detail-backdrop" :style="movie.cover ? { backgroundImage: `url(${movie.cover})` } : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }"></div>
                <div class="detail-gradient"></div>
                <div class="detail-hero-content">
                    <button class="btn-back" @click="$router.back()">
                        <ArrowLeft :size="18" /> Back
                    </button>
                    <div class="type-badge" v-if="movie.contentType === 'series'">
                        <Tv :size="14" /> Series
                    </div>
                    <h1 class="detail-title">{{ movie.title }}</h1>
                    <div class="detail-meta">
                        <span v-if="movie.rating" class="detail-match">{{ Math.round(movie.rating * 10) }}% Match</span>
                        <span v-if="movie.year">{{ movie.year }}</span>
                        <span v-if="movie.runtime">{{ movie.runtime }}</span>
                        <span v-if="movie.totalSeasons">{{ movie.totalSeasons }} Seasons</span>
                        <span v-if="movie.country">{{ movie.country }}</span>
                    </div>
                    <div class="detail-actions">
                        <button class="btn-play-large" @click="playDefault">
                            <Play :size="26" />
                            {{ movie.contentType === 'series' && firstEpisode ? `Play S${firstEpisode.season}E${firstEpisode.episode}` : 'Play' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Season/Episode Selector (series only) -->
            <div v-if="movie.contentType === 'series' && movie.seasons && movie.seasons.length > 0" class="episodes-section">
                <div class="season-selector">
                    <button
                        v-for="season in movie.seasons"
                        :key="season.seasonNumber"
                        class="season-pill"
                        :class="{ active: selectedSeason === season.seasonNumber }"
                        @click="selectedSeason = season.seasonNumber"
                    >
                        Season {{ season.seasonNumber }}
                    </button>
                </div>

                <div class="episode-list" v-if="currentSeasonData">
                    <!-- Season pack -->
                    <div v-if="currentSeasonData.hasMagnet" class="episode-row season-pack" @click="playSeason(selectedSeason)">
                        <div class="episode-info">
                            <Download :size="16" />
                            <span class="episode-title">Play Full Season {{ selectedSeason }}</span>
                        </div>
                        <button class="btn-episode-play">
                            <Play :size="16" />
                        </button>
                    </div>

                    <!-- Individual episodes -->
                    <div
                        v-for="ep in currentSeasonData.episodes"
                        :key="ep.episodeNumber"
                        class="episode-row"
                        :class="{ disabled: !ep.hasMagnet }"
                        @click="ep.hasMagnet && playEpisode(selectedSeason, ep.episodeNumber)"
                    >
                        <div class="episode-info">
                            <span class="episode-number">{{ ep.episodeNumber }}</span>
                            <span class="episode-title">Episode {{ ep.episodeNumber }}</span>
                            <span v-if="ep.bestSeeds" class="episode-seeds">
                                <ArrowUp :size="12" /> {{ ep.bestSeeds }}
                            </span>
                        </div>
                        <button v-if="ep.hasMagnet" class="btn-episode-play">
                            <Play :size="16" />
                        </button>
                        <span v-else class="episode-unavailable">Unavailable</span>
                    </div>

                    <p v-if="!currentSeasonData.episodes || currentSeasonData.episodes.length === 0" class="no-episodes">
                        No individual episodes available. Use the season pack above.
                    </p>
                </div>
            </div>

            <!-- Series pack button -->
            <div v-if="movie.contentType === 'series' && movie.hasSeriesMagnet" class="series-pack">
                <button class="btn-series-pack" @click="playMovie">
                    <Download :size="18" /> Play Complete Series
                </button>
            </div>

            <div class="detail-body">
                <div class="detail-main">
                    <p v-if="movie.summary" class="detail-summary">{{ movie.summary }}</p>
                </div>
                <div class="detail-sidebar">
                    <p v-if="movie.director"><span class="label">Director:</span> {{ movie.director }}</p>
                    <p v-if="movie.actors"><span class="label">Cast:</span> {{ movie.actors }}</p>
                    <p v-if="movie.writer"><span class="label">Writer:</span> {{ movie.writer }}</p>
                    <p v-if="movie.genres && movie.genres.length"><span class="label">Genres:</span> {{ movie.genres.join(', ') }}</p>
                </div>
            </div>

            <div class="comments-section">
                <h2>Comments</h2>
                <form @submit.prevent="addComment" class="comment-form">
                    <input v-model="newComment" type="text" placeholder="Add a comment..." class="comment-input" />
                    <button type="submit" class="btn-comment" :disabled="!newComment.trim()">Post</button>
                </form>
                <div class="comments-list">
                    <div v-for="(comment, index) in (movie.comments || [])" :key="index" class="comment-item">
                        <div class="comment-avatar"><User :size="16" /></div>
                        <div class="comment-body"><p class="comment-content">{{ comment.content }}</p></div>
                    </div>
                    <p v-if="!movie.comments || movie.comments.length === 0" class="no-comments">No comments yet. Be the first!</p>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import Api from '@/services/Api';
import { ArrowLeft, Play, User, Tv, Download, ArrowUp } from 'lucide-vue-next';

export default {
    name: 'MovieDetail',
    components: { ArrowLeft, Play, User, Tv, Download, ArrowUp },
    data() {
        return {
            movie: null,
            loading: true,
            newComment: '',
            selectedSeason: 1,
        };
    },
    computed: {
        currentSeasonData() {
            if (!this.movie || !this.movie.seasons) return null;
            return this.movie.seasons.find(s => s.seasonNumber === this.selectedSeason);
        },
        firstEpisode() {
            if (!this.movie || !this.movie.seasons || this.movie.seasons.length === 0) return null;
            const season = this.movie.seasons[0];
            if (season.episodes && season.episodes.length > 0) {
                return { season: season.seasonNumber, episode: season.episodes[0].episodeNumber };
            }
            if (season.hasMagnet) {
                return { season: season.seasonNumber, episode: null };
            }
            return null;
        },
    },
    async mounted() {
        await this.fetchMovie();
    },
    methods: {
        playDefault() {
            if (this.movie.contentType === 'series' && this.firstEpisode) {
                if (this.firstEpisode.episode) {
                    this.playEpisode(this.firstEpisode.season, this.firstEpisode.episode);
                } else {
                    this.playSeason(this.firstEpisode.season);
                }
            } else {
                this.playMovie();
            }
        },
        playMovie() {
            this.$router.push({ name: 'Watch', params: { id: this.movie._id } });
        },
        playEpisode(season, episode) {
            this.$router.push({ name: 'Watch', params: { id: this.movie._id }, query: { season, episode } });
        },
        playSeason(season) {
            this.$router.push({ name: 'Watch', params: { id: this.movie._id }, query: { season } });
        },
        async fetchMovie() {
            this.loading = true;
            try {
                const response = await Api().get(`movie/${this.$route.params.id}`);
                this.movie = response.data;
                if (this.movie.seasons && this.movie.seasons.length > 0) {
                    this.selectedSeason = this.movie.seasons[0].seasonNumber;
                }
            } catch (err) {
                console.error('Failed to load movie:', err);
            } finally {
                this.loading = false;
            }
        },
        async addComment() {
            if (!this.newComment.trim()) return;
            try {
                await Api().post(`comment/${this.movie._id}`, { content: this.newComment });
                this.movie.comments = this.movie.comments || [];
                this.movie.comments.push({ content: this.newComment });
                this.newComment = '';
            } catch (err) {
                console.error('Failed to post comment:', err);
            }
        },
    },
};
</script>

<style scoped>
.detail-page { background: #141414; min-height: 100vh; }

.detail-loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
.spinner { width: 48px; height: 48px; border: 4px solid #333; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.detail-hero { position: relative; height: 70vh; min-height: 450px; display: flex; align-items: flex-end; padding: 0 4% 5%; }
.detail-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(0.4); }
.detail-gradient { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, #141414 100%); }
.detail-hero-content { position: relative; z-index: 2; max-width: 600px; }

.btn-back { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); border: none; border-radius: 4px; color: #fff; padding: 8px 16px; font-size: 0.85rem; cursor: pointer; margin-bottom: 20px; transition: background 0.2s; }
.btn-back:hover { background: rgba(255,255,255,0.2); }

.type-badge { display: inline-flex; align-items: center; gap: 5px; background: #E50914; color: #fff; padding: 4px 10px; border-radius: 3px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }

.detail-title { font-size: 3rem; font-weight: 900; color: #fff; margin-bottom: 12px; text-shadow: 2px 2px 8px rgba(0,0,0,0.6); }
.detail-meta { display: flex; gap: 14px; color: #ddd; font-size: 0.95rem; margin-bottom: 20px; flex-wrap: wrap; }
.detail-match { color: #46d369; font-weight: 700; }

.btn-play-large { display: inline-flex; align-items: center; gap: 10px; background: #fff; color: #000; border: none; border-radius: 4px; padding: 12px 36px; font-size: 1.2rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-play-large:hover { opacity: 0.8; }

/* Episodes Section */
.episodes-section { padding: 0 4%; max-width: 900px; }
.season-selector { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.season-pill { background: #333; color: #ccc; border: none; border-radius: 20px; padding: 8px 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.season-pill:hover { background: #444; }
.season-pill.active { background: #E50914; color: #fff; }

.episode-list { margin-bottom: 24px; }
.episode-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #222; cursor: pointer; transition: background 0.2s; border-radius: 4px; }
.episode-row:hover { background: #1e1e1e; }
.episode-row.disabled { opacity: 0.4; cursor: default; }
.episode-row.disabled:hover { background: transparent; }
.episode-row.season-pack { background: #1a1a2e; border: 1px solid #333; margin-bottom: 8px; }

.episode-info { display: flex; align-items: center; gap: 14px; }
.episode-number { color: #555; font-size: 1.2rem; font-weight: 700; width: 28px; text-align: center; }
.episode-title { color: #e5e5e5; font-size: 0.95rem; font-weight: 500; }
.episode-seeds { color: #46d369; font-size: 0.75rem; display: flex; align-items: center; gap: 3px; }
.episode-unavailable { color: #555; font-size: 0.8rem; }

.btn-episode-play { background: rgba(255,255,255,0.1); border: 1px solid #555; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.2s; }
.btn-episode-play:hover { background: #fff; color: #000; border-color: #fff; }

.no-episodes { color: #666; font-style: italic; padding: 12px 0; }

.series-pack { padding: 0 4% 20px; }
.btn-series-pack { display: inline-flex; align-items: center; gap: 8px; background: rgba(109,109,110,0.4); color: #fff; border: none; border-radius: 4px; padding: 10px 24px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-series-pack:hover { background: rgba(109,109,110,0.7); }

.detail-body { display: flex; gap: 40px; padding: 40px 4%; max-width: 1200px; }
.detail-main { flex: 2; }
.detail-summary { color: #ddd; font-size: 1.05rem; line-height: 1.6; }
.detail-sidebar { flex: 1; }
.detail-sidebar p { color: #999; font-size: 0.9rem; margin-bottom: 10px; line-height: 1.5; }
.label { color: #777; }

.comments-section { padding: 40px 4%; max-width: 1200px; border-top: 1px solid #333; }
.comments-section h2 { color: #fff; font-size: 1.4rem; margin-bottom: 20px; }
.comment-form { display: flex; gap: 12px; margin-bottom: 24px; }
.comment-input { flex: 1; background: #333; border: none; border-radius: 4px; padding: 12px 16px; color: #fff; font-size: 0.95rem; outline: none; }
.comment-input::placeholder { color: #888; }
.comment-input:focus { background: #404040; }
.btn-comment { background: #E50914; color: #fff; border: none; border-radius: 4px; padding: 12px 24px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-comment:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-comment:hover:not(:disabled) { background: #f40612; }

.comment-item { display: flex; gap: 12px; margin-bottom: 16px; }
.comment-avatar { width: 36px; height: 36px; border-radius: 50%; background: #333; color: #999; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.comment-content { color: #ddd; font-size: 0.95rem; line-height: 1.4; padding-top: 8px; }
.no-comments { color: #666; font-style: italic; }

@media (max-width: 768px) {
    .detail-title { font-size: 1.8rem; }
    .detail-body { flex-direction: column; gap: 20px; }
}
</style>
