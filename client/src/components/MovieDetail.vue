<template>
    <div class="detail-page">
        <div v-if="loading" class="detail-loading"><div class="spinner"></div></div>

        <template v-else-if="movie">
            <!-- Hero -->
            <div class="detail-hero">
                <div class="detail-backdrop" :style="movie.cover ? { backgroundImage: `url(${movie.cover})` } : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }"></div>
                <div class="detail-gradient"></div>
                <div class="detail-hero-content">
                    <button class="btn-back" @click="$router.back()"><ArrowLeft :size="18" /> Back</button>
                    <span v-if="movie.contentType === 'series'" class="type-badge"><Tv :size="12" /> Series</span>
                    <h1 class="detail-title">{{ movie.title }}</h1>
                    <div class="detail-meta">
                        <span v-if="movie.rating" class="imdb-badge"><Star :size="13" /> {{ movie.rating }}</span>
                        <span v-if="movie.year">{{ movie.year }}</span>
                        <span v-if="movie.runtime">{{ movie.runtime }}</span>
                        <span v-if="movie.totalSeasons">{{ movie.totalSeasons }} Seasons</span>
                        <span v-if="movie.genres && movie.genres.length" class="genres-text">{{ movie.genres.slice(0, 4).join(' / ') }}</span>
                    </div>
                    <p v-if="movie.summary" class="detail-summary">{{ movie.summary }}</p>

                    <div class="detail-actions">
                        <!-- Quality selector -->
                        <div class="quality-group" v-if="availableQualities.length > 1">
                            <button
                                v-for="q in availableQualities" :key="q"
                                class="quality-btn" :class="{ active: selectedQuality === q }"
                                @click="selectedQuality = q"
                            >{{ q }}</button>
                        </div>
                        <button v-if="resumeTarget" class="btn-play-large btn-resume" @click="playResume">
                            <RotateCcw :size="22" />
                            <span>
                                Resume
                                <template v-if="resumeTarget.type === 'episode'">
                                    S{{ resumeTarget.season }}E{{ resumeTarget.episode }}
                                </template>
                                <span class="resume-time">from {{ formatRemaining(resumeTarget.progress) }}</span>
                            </span>
                        </button>
                        <button class="btn-play-large" @click="playDefault">
                            <Play :size="24" />
                            {{ resumeTarget ? 'Start Over' : (movie.contentType === 'series' && firstEpisode ? `Play S${firstEpisode.season}E${firstEpisode.episode}` : 'Play') }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Cast & Info -->
            <div class="detail-info">
                <div class="info-chips">
                    <span v-if="movie.director" class="info-chip"><span class="chip-label">Director</span> {{ movie.director }}</span>
                    <span v-if="movie.actors" class="info-chip"><span class="chip-label">Cast</span> {{ movie.actors }}</span>
                    <span v-if="movie.country" class="info-chip"><span class="chip-label">Country</span> {{ movie.country }}</span>
                </div>
            </div>

            <!-- Episodes (series only) -->
            <div v-if="movie.contentType === 'series' && movie.seasons && movie.seasons.length > 0" class="episodes-section">
                <div class="episodes-header">
                    <h2>Episodes</h2>
                    <div class="season-selector">
                        <button
                            v-for="season in movie.seasons" :key="season.seasonNumber"
                            class="season-pill" :class="{ active: selectedSeason === season.seasonNumber }"
                            @click="selectedSeason = season.seasonNumber"
                        >
                            Season {{ season.seasonNumber }}
                            <span v-if="season.episodeCount" class="ep-count">({{ season.episodeCount }})</span>
                        </button>
                    </div>
                </div>

                <!-- Season pack -->
                <div v-if="currentSeasonData && currentSeasonData.hasMagnet" class="episode-row season-pack" @click="playSeason(selectedSeason)">
                    <div class="ep-left">
                        <div class="ep-thumb pack-thumb"><Download :size="20" /></div>
                        <div class="ep-info">
                            <h3>Full Season {{ selectedSeason }}</h3>
                            <p class="ep-desc">Complete season pack — all episodes</p>
                        </div>
                    </div>
                    <Play :size="18" class="ep-play-icon" />
                </div>

                <!-- Episode list -->
                <div
                    v-for="ep in currentEpisodes" :key="ep.episodeNumber"
                    class="episode-row" :class="{ disabled: !ep.hasMagnet }"
                    @click="ep.hasMagnet && playEpisode(selectedSeason, ep.episodeNumber)"
                >
                    <div class="ep-left">
                        <div class="ep-thumb"><span class="ep-num">{{ ep.episodeNumber }}</span></div>
                        <div class="ep-info">
                            <h3>
                                {{ ep.title || `Episode ${ep.episodeNumber}` }}
                                <span v-if="ep.rating" class="ep-rating"><Star :size="11" /> {{ ep.rating }}</span>
                            </h3>
                            <p v-if="ep.released" class="ep-desc">{{ formatDate(ep.released) }}</p>
                            <div v-if="episodeProgress(selectedSeason, ep.episodeNumber)" class="ep-progress">
                                <div class="ep-progress-bar" :style="{ width: episodeProgressPct(selectedSeason, ep.episodeNumber) + '%' }"></div>
                            </div>
                            <div v-if="ep.qualities && ep.qualities.length" class="ep-qualities">
                                <span v-for="q in ep.qualities" :key="q" class="quality-tag">{{ q }}</span>
                            </div>
                        </div>
                    </div>
                    <RotateCcw v-if="ep.hasMagnet && episodeProgress(selectedSeason, ep.episodeNumber)" :size="18" class="ep-play-icon" />
                    <Play v-else-if="ep.hasMagnet" :size="18" class="ep-play-icon" />
                    <span v-else class="ep-unavailable">No source</span>
                </div>

                <p v-if="currentEpisodes.length === 0 && (!currentSeasonData || !currentSeasonData.hasMagnet)" class="no-episodes">
                    No episodes available for this season yet.
                </p>
            </div>

            <!-- Series pack -->
            <div v-if="movie.hasSeriesMagnet" class="series-pack-bar">
                <button class="btn-series-pack" @click="playMovie"><Download :size="16" /> Play Complete Series</button>
            </div>

            <!-- Comments -->
            <div class="comments-section">
                <h2>Comments</h2>
                <form @submit.prevent="addComment" class="comment-form">
                    <input v-model="newComment" type="text" placeholder="Add a comment..." class="comment-input" />
                    <button type="submit" class="btn-comment" :disabled="!newComment.trim()">Post</button>
                </form>
                <div class="comments-list">
                    <div v-for="(comment, i) in (movie.comments || [])" :key="i" class="comment-item">
                        <div class="comment-avatar"><User :size="16" /></div>
                        <p class="comment-content">{{ comment.content }}</p>
                    </div>
                    <p v-if="!movie.comments || movie.comments.length === 0" class="no-comments">No comments yet.</p>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import Api from '@/services/Api';
import { getProgress, clearProgress, formatTime } from '@/services/ProgressService';

let warmupInFlight = null;
import { ArrowLeft, Play, User, Tv, Download, Star, RotateCcw } from 'lucide-vue-next';

export default {
    name: 'MovieDetail',
    components: { ArrowLeft, Play, User, Tv, Download, Star, RotateCcw },
    data() {
        return {
            movie: null,
            loading: true,
            newComment: '',
            selectedSeason: 1,
            selectedQuality: null,
            progressTick: 0,
        };
    },
    computed: {
        currentSeasonData() {
            if (!this.movie?.seasons) return null;
            return this.movie.seasons.find(s => s.seasonNumber === this.selectedSeason);
        },
        currentEpisodes() {
            return this.currentSeasonData?.episodes || [];
        },
        firstEpisode() {
            if (!this.movie?.seasons?.length) return null;
            const s = this.movie.seasons[0];
            const ep = s.episodes?.find(e => e.hasMagnet);
            if (ep) return { season: s.seasonNumber, episode: ep.episodeNumber };
            if (s.hasMagnet) return { season: s.seasonNumber, episode: null };
            return null;
        },
        movieProgress() {
            // progressTick is referenced to trigger recompute on localStorage changes
            this.progressTick; // eslint-disable-line no-unused-expressions
            if (!this.movie || this.movie.contentType === 'series') return null;
            return getProgress(this.movie._id);
        },
        resumeTarget() {
            // For series, resume the most recently watched episode if any
            this.progressTick; // eslint-disable-line no-unused-expressions
            if (!this.movie) return null;
            if (this.movie.contentType !== 'series') {
                return this.movieProgress ? { type: 'movie', progress: this.movieProgress } : null;
            }
            let best = null;
            for (const season of (this.movie.seasons || [])) {
                for (const ep of (season.episodes || [])) {
                    const p = getProgress(this.movie._id, season.seasonNumber, ep.episodeNumber);
                    if (p && (!best || p.updatedAt > best.progress.updatedAt)) {
                        best = { type: 'episode', season: season.seasonNumber, episode: ep.episodeNumber, progress: p };
                    }
                }
            }
            return best;
        },
        availableQualities() {
            if (this.movie?.qualities?.length) return this.movie.qualities;
            if (this.currentSeasonData) {
                const all = new Set();
                this.currentEpisodes.forEach(e => (e.qualities || []).forEach(q => all.add(q)));
                (this.currentSeasonData.qualities || []).forEach(q => all.add(q));
                return [...all];
            }
            return [];
        },
    },
    async mounted() {
        await this.fetchMovie();
    },
    methods: {
        playDefault() {
            // If user chose "Start Over" (resume exists), clear the target's saved position first
            if (this.resumeTarget) {
                const r = this.resumeTarget;
                if (r.type === 'movie') clearProgress(this.movie._id);
                else clearProgress(this.movie._id, r.season, r.episode);
                this.progressTick++;
            }
            if (this.movie.contentType === 'series' && this.firstEpisode) {
                if (this.firstEpisode.episode) this.playEpisode(this.firstEpisode.season, this.firstEpisode.episode);
                else this.playSeason(this.firstEpisode.season);
            } else {
                this.playMovie();
            }
        },
        playMovie() {
            const query = this.selectedQuality ? { quality: this.selectedQuality } : {};
            this.$router.push({ name: 'Watch', params: { id: this.movie._id }, query });
        },
        playEpisode(season, episode) {
            const query = { season, episode };
            if (this.selectedQuality) query.quality = this.selectedQuality;
            this.$router.push({ name: 'Watch', params: { id: this.movie._id }, query });
        },
        playSeason(season) {
            const query = { season };
            if (this.selectedQuality) query.quality = this.selectedQuality;
            this.$router.push({ name: 'Watch', params: { id: this.movie._id }, query });
        },
        episodeProgress(season, episode) {
            this.progressTick; // eslint-disable-line no-unused-expressions
            return getProgress(this.movie._id, season, episode);
        },
        episodeProgressPct(season, episode) {
            const p = this.episodeProgress(season, episode);
            if (!p?.duration) return 0;
            return Math.min(100, (p.position / p.duration) * 100);
        },
        playResume() {
            const r = this.resumeTarget;
            if (!r) return;
            if (r.type === 'movie') this.playMovie();
            else this.playEpisode(r.season, r.episode);
        },
        formatRemaining(progress) {
            if (!progress) return '';
            return formatTime(progress.position);
        },
        formatDate(d) {
            if (!d || d === 'N/A') return '';
            try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
            catch { return d; }
        },
        async fetchMovie() {
            this.loading = true;
            try {
                const response = await Api().get(`movie/${this.$route.params.id}`);
                this.movie = response.data;
                if (this.movie.seasons?.length) this.selectedSeason = this.movie.seasons[0].seasonNumber;
                this.warmUpTorrent();
            } catch (err) { console.error('Failed to load:', err); }
            finally { this.loading = false; }
        },
        warmUpTorrent() {
            if (!this.movie) return;
            const params = new URLSearchParams();
            if (this.movie.contentType === 'series') {
                // Prefer the episode the user would see "Resume" on; fall back to first available
                const resume = this.resumeTarget;
                const target = resume?.type === 'episode'
                    ? { season: resume.season, episode: resume.episode }
                    : this.firstEpisode;
                if (!target) return;
                params.set('season', target.season);
                if (target.episode) params.set('episode', target.episode);
            } else if (!this.movie.hasMagnet) {
                return;
            }
            if (this.selectedQuality) params.set('quality', this.selectedQuality);
            const qs = params.toString();
            const key = `${this.movie._id}?${qs}`;
            if (warmupInFlight === key) return; // already warming this exact target
            warmupInFlight = key;
            Api().get(`prepare/${this.movie._id}${qs ? '?' + qs : ''}`)
                .catch(() => {})
                .finally(() => { if (warmupInFlight === key) warmupInFlight = null; });
        },
        async addComment() {
            if (!this.newComment.trim()) return;
            try {
                await Api().post(`comment/${this.movie._id}`, { content: this.newComment });
                this.movie.comments = this.movie.comments || [];
                this.movie.comments.push({ content: this.newComment });
                this.newComment = '';
            } catch (err) { console.error(err); }
        },
    },
};
</script>

<style scoped>
.detail-page { background: #141414; min-height: 100vh; }
.detail-loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
.spinner { width: 48px; height: 48px; border: 4px solid #333; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Hero */
.detail-hero { position: relative; height: 65vh; min-height: 400px; display: flex; align-items: flex-end; padding: 0 4% 4%; }
.detail-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(0.35); }
.detail-gradient { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 20%, #141414 100%); }
.detail-hero-content { position: relative; z-index: 2; max-width: 650px; }
.btn-back { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: none; border-radius: 4px; color: #fff; padding: 8px 16px; font-size: 0.85rem; cursor: pointer; margin-bottom: 16px; transition: background 0.2s; }
.btn-back:hover { background: rgba(255,255,255,0.15); }
.type-badge { display: inline-flex; align-items: center; gap: 4px; background: #6366f1; color: #fff; padding: 3px 10px; border-radius: 3px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
.detail-title { font-size: 2.6rem; font-weight: 900; color: #fff; margin-bottom: 10px; text-shadow: 0 2px 12px rgba(0,0,0,0.5); }
.detail-meta { display: flex; gap: 12px; align-items: center; color: #bbb; font-size: 0.9rem; margin-bottom: 12px; flex-wrap: wrap; }
.imdb-badge { color: #f5c518; font-weight: 700; display: flex; align-items: center; gap: 3px; }
.genres-text { color: #888; }
.detail-summary { color: #ccc; font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; max-width: 550px; }
.detail-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.btn-play-large { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #000; border: none; border-radius: 4px; padding: 11px 24px; font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-play-large:hover { opacity: 0.85; }
.btn-resume { background: #E50914; color: #fff; }
.btn-resume .resume-time { display: block; font-size: 0.7rem; font-weight: 500; opacity: 0.85; margin-top: 1px; }

/* Quality selector */
.quality-group { display: flex; gap: 4px; }
.quality-btn { background: rgba(255,255,255,0.08); border: 1px solid #444; color: #aaa; border-radius: 4px; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.quality-btn:hover { border-color: #888; color: #fff; }
.quality-btn.active { background: #E50914; border-color: #E50914; color: #fff; }

/* Info bar */
.detail-info { padding: 20px 4%; }
.info-chips { display: flex; gap: 20px; flex-wrap: wrap; }
.info-chip { color: #999; font-size: 0.85rem; }
.chip-label { color: #666; margin-right: 4px; }

/* Episodes */
.episodes-section { padding: 0 4% 20px; max-width: 900px; }
.episodes-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.episodes-header h2 { color: #fff; font-size: 1.4rem; font-weight: 700; }
.season-selector { display: flex; gap: 6px; flex-wrap: wrap; }
.season-pill { background: #222; color: #aaa; border: none; border-radius: 20px; padding: 7px 18px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.season-pill:hover { background: #333; color: #fff; }
.season-pill.active { background: #E50914; color: #fff; }
.ep-count { opacity: 0.7; font-weight: 400; margin-left: 2px; }

/* Episode rows */
.episode-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #1e1e1e; cursor: pointer; border-radius: 6px; transition: background 0.2s; }
.episode-row:hover { background: #1a1a1a; }
.episode-row.disabled { opacity: 0.35; cursor: default; }
.episode-row.disabled:hover { background: transparent; }
.episode-row.season-pack { background: #16162a; border: 1px solid #2a2a4a; margin-bottom: 8px; }

.ep-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.ep-thumb { width: 44px; height: 44px; border-radius: 6px; background: #222; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pack-thumb { background: #2a2a4a; color: #8b8bf5; }
.ep-num { color: #666; font-size: 1.1rem; font-weight: 700; }
.ep-info { min-width: 0; }
.ep-info h3 { color: #e5e5e5; font-size: 0.9rem; font-weight: 600; margin: 0 0 2px; display: flex; align-items: center; gap: 8px; }
.ep-rating { color: #f5c518; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 2px; }
.ep-desc { color: #666; font-size: 0.78rem; margin: 0; }
.ep-progress { width: 180px; height: 3px; background: #333; border-radius: 2px; margin-top: 6px; overflow: hidden; max-width: 100%; }
.ep-progress-bar { height: 100%; background: #E50914; transition: width 0.3s; }
.ep-qualities { display: flex; gap: 4px; margin-top: 4px; }
.quality-tag { background: #222; color: #888; font-size: 0.65rem; padding: 1px 6px; border-radius: 2px; }
.ep-play-icon { color: #999; flex-shrink: 0; transition: color 0.2s; }
.episode-row:hover .ep-play-icon { color: #fff; }
.ep-unavailable { color: #444; font-size: 0.75rem; flex-shrink: 0; }
.no-episodes { color: #555; font-style: italic; padding: 16px 0; }

/* Series pack */
.series-pack-bar { padding: 0 4% 20px; }
.btn-series-pack { display: inline-flex; align-items: center; gap: 8px; background: rgba(109,109,110,0.3); color: #ccc; border: none; border-radius: 4px; padding: 10px 20px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
.btn-series-pack:hover { background: rgba(109,109,110,0.5); }

/* Comments */
.comments-section { padding: 30px 4%; max-width: 900px; border-top: 1px solid #222; }
.comments-section h2 { color: #fff; font-size: 1.2rem; margin-bottom: 16px; }
.comment-form { display: flex; gap: 10px; margin-bottom: 20px; }
.comment-input { flex: 1; background: #222; border: none; border-radius: 4px; padding: 11px 14px; color: #fff; font-size: 0.9rem; outline: none; }
.comment-input::placeholder { color: #555; }
.comment-input:focus { background: #2a2a2a; }
.btn-comment { background: #E50914; color: #fff; border: none; border-radius: 4px; padding: 11px 20px; font-weight: 700; cursor: pointer; }
.btn-comment:disabled { opacity: 0.3; cursor: not-allowed; }
.comment-item { display: flex; gap: 10px; margin-bottom: 12px; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: #222; color: #666; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.comment-content { color: #ccc; font-size: 0.9rem; line-height: 1.4; padding-top: 6px; margin: 0; }
.no-comments { color: #444; font-style: italic; }

@media (max-width: 768px) {
    .detail-title { font-size: 1.8rem; }
    .detail-hero { height: 55vh; }
    .episodes-header { flex-direction: column; align-items: flex-start; }
}
</style>
