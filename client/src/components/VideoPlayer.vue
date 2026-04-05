<template>
    <div class="player-page">
        <button class="btn-back" @click="goBack">
            <ArrowLeft :size="20" />
            <span>Back</span>
        </button>

        <!-- Buffering -->
        <div v-if="!ready" class="player-loading">
            <div v-if="error" class="loading-error">
                <AlertCircle :size="48" color="#E50914" />
                <p>{{ error }}</p>
                <button class="btn-retry" @click="startPrepare">Try Again</button>
            </div>
            <div v-else class="loading-progress">
                <div class="progress-ring">
                    <svg viewBox="0 0 120 120">
                        <circle class="ring-bg" cx="60" cy="60" r="52" />
                        <circle class="ring-fill" cx="60" cy="60" r="52" :stroke-dasharray="327" :stroke-dashoffset="327 - (327 * displayProgress)" />
                    </svg>
                    <div class="progress-text"><span class="progress-percent">{{ Math.round(displayProgress * 100) }}%</span></div>
                </div>
                <h2 class="loading-title">{{ movie?.title }}{{ episodeLabel }}</h2>
                <p class="loading-status">{{ statusMessage }}</p>
                <div class="loading-stats" v-if="stats.peers > 0">
                    <span><Wifi :size="14" /> {{ stats.peers }} peers</span>
                    <span><ArrowDown :size="14" /> {{ stats.speedFormatted }}</span>
                    <span><HardDrive :size="14" /> {{ stats.downloadedFormatted }}</span>
                </div>
            </div>
        </div>

        <!-- Player -->
        <div v-else class="player-container">
            <video
                ref="video"
                class="video-player"
                controls
                autoplay
                :src="streamUrl"
                @error="onVideoError"
                @ended="onVideoEnded"
            >
                <track v-if="subtitles.en" kind="subtitles" :src="apiBase + subtitles.en" srclang="en" label="English" />
                <track v-if="subtitles.fr" kind="subtitles" :src="apiBase + subtitles.fr" srclang="fr" label="French" />
            </video>

            <!-- Next episode overlay -->
            <div v-if="showNextOverlay && nextEpisode" class="next-overlay">
                <p>Next Episode</p>
                <h3>S{{ nextEpisode.season }}E{{ nextEpisode.episode }}{{ nextEpisode.title ? ' - ' + nextEpisode.title : '' }}</h3>
                <div class="next-actions">
                    <button class="btn-next" @click="playNext">
                        <Play :size="18" /> Play Now
                    </button>
                    <button class="btn-dismiss" @click="showNextOverlay = false">Dismiss</button>
                </div>
                <div class="next-countdown">Playing in {{ nextCountdown }}s...</div>
            </div>

            <div class="player-info">
                <h1>{{ movie?.title }}{{ episodeLabel }}</h1>
                <div class="player-meta">
                    <span v-if="movie?.year">{{ movie.year }}</span>
                    <span v-if="movie?.runtime">{{ movie.runtime }}</span>
                    <span v-if="movie?.rating" class="rating"><Star :size="13" /> {{ movie.rating }}</span>
                    <span v-if="stats.peers > 0" class="peers"><Wifi :size="13" /> {{ stats.peers }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Api from '@/services/Api';
import { ArrowLeft, AlertCircle, Wifi, ArrowDown, HardDrive, Play, Star } from 'lucide-vue-next';

export default {
    name: 'VideoPlayer',
    components: { ArrowLeft, AlertCircle, Wifi, ArrowDown, HardDrive, Play, Star },
    data() {
        return {
            movie: null,
            ready: false,
            error: null,
            streamUrl: null,
            subtitles: { en: null, fr: null },
            apiBase: 'http://localhost:8081',
            pollTimer: null,
            showNextOverlay: false,
            nextCountdown: 10,
            nextTimer: null,
            stats: { status: 'connecting', progress: 0, downloaded: 0, downloadedFormatted: '0 B', fileSize: 0, fileSizeFormatted: '0 B', speed: 0, speedFormatted: '0 B/s', peers: 0, fileName: '' },
        };
    },
    computed: {
        displayProgress() { return this.stats.progress || 0; },
        episodeLabel() {
            const s = this.$route.query.season;
            const e = this.$route.query.episode;
            if (s && e) return ` - S${s}E${e}`;
            if (s) return ` - Season ${s}`;
            return '';
        },
        statusMessage() {
            switch (this.stats.status) {
                case 'connecting': return 'Finding peers...';
                case 'buffering': return 'Buffering video...';
                case 'ready': return 'Starting playback...';
                default: return 'Preparing stream...';
            }
        },
        nextEpisode() {
            if (!this.movie || this.movie.contentType !== 'series' || !this.movie.seasons) return null;
            const s = Number(this.$route.query.season);
            const e = Number(this.$route.query.episode);
            if (!s || !e) return null;

            const season = this.movie.seasons.find(x => x.seasonNumber === s);
            if (!season) return null;

            // Next episode in same season
            const nextEp = season.episodes?.find(x => x.episodeNumber === e + 1 && x.hasMagnet);
            if (nextEp) return { season: s, episode: nextEp.episodeNumber, title: nextEp.title };

            // First episode of next season
            const nextSeason = this.movie.seasons.find(x => x.seasonNumber === s + 1);
            if (nextSeason?.episodes?.length) {
                const firstEp = nextSeason.episodes.find(x => x.hasMagnet);
                if (firstEp) return { season: s + 1, episode: firstEp.episodeNumber, title: firstEp.title };
            }
            return null;
        },
    },
    async mounted() {
        await this.loadMovie();
        this.startPrepare();
        this.loadSubtitles();
    },
    beforeUnmount() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        if (this.nextTimer) clearInterval(this.nextTimer);
    },
    methods: {
        buildQueryString() {
            const params = new URLSearchParams();
            if (this.$route.query.season) params.set('season', this.$route.query.season);
            if (this.$route.query.episode) params.set('episode', this.$route.query.episode);
            if (this.$route.query.quality) params.set('quality', this.$route.query.quality);
            const qs = params.toString();
            return qs ? `?${qs}` : '';
        },
        async loadMovie() {
            try {
                const response = await Api().get(`movie/${this.$route.params.id}`);
                this.movie = response.data;
            } catch (err) { this.error = 'Failed to load movie info.'; }
        },
        startPrepare() {
            this.error = null; this.ready = false;
            this.pollStatus();
            this.pollTimer = setInterval(() => this.pollStatus(), 1500);
        },
        async pollStatus() {
            try {
                const qs = this.buildQueryString();
                const response = await Api().get(`prepare/${this.$route.params.id}${qs}`);
                this.stats = response.data;
                if (this.stats.status === 'ready') {
                    clearInterval(this.pollTimer); this.pollTimer = null;
                    this.streamUrl = `${this.apiBase}/stream/${this.$route.params.id}${qs}`;
                    this.ready = true;
                } else if (this.stats.status === 'error') {
                    clearInterval(this.pollTimer); this.pollTimer = null;
                    this.error = this.stats.error || 'Failed to prepare stream';
                }
            } catch (err) { /* keep polling */ }
        },
        async loadSubtitles() {
            try { const r = await Api().get(`subtitles/${this.$route.params.id}`); this.subtitles = r.data; }
            catch (err) { /* optional */ }
        },
        onVideoError() {
            if (this.ready) { this.error = 'Playback failed. Retrying...'; this.ready = false; this.startPrepare(); }
        },
        onVideoEnded() {
            if (this.nextEpisode) {
                this.showNextOverlay = true;
                this.nextCountdown = 10;
                this.nextTimer = setInterval(() => {
                    this.nextCountdown--;
                    if (this.nextCountdown <= 0) { clearInterval(this.nextTimer); this.playNext(); }
                }, 1000);
            }
        },
        playNext() {
            if (this.nextTimer) clearInterval(this.nextTimer);
            this.showNextOverlay = false;
            const query = { season: this.nextEpisode.season, episode: this.nextEpisode.episode };
            if (this.$route.query.quality) query.quality = this.$route.query.quality;
            this.$router.push({ name: 'Watch', params: { id: this.$route.params.id }, query });
            // Reset player state for new episode
            this.$nextTick(() => {
                this.ready = false; this.streamUrl = null; this.error = null;
                this.startPrepare();
            });
        },
        goBack() {
            if (this.pollTimer) clearInterval(this.pollTimer);
            if (this.nextTimer) clearInterval(this.nextTimer);
            this.$router.back();
        },
    },
};
</script>

<style scoped>
.player-page { background: #000; min-height: 100vh; display: flex; flex-direction: column; }
.btn-back { position: fixed; top: 20px; left: 20px; z-index: 100; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.6); border: none; border-radius: 4px; color: #fff; padding: 10px 18px; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
.btn-back:hover { background: rgba(255,255,255,0.15); }

.player-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-error { display: flex; flex-direction: column; align-items: center; gap: 16px; color: #999; }
.loading-error p { font-size: 1rem; max-width: 400px; text-align: center; }
.btn-retry { background: #E50914; color: #fff; border: none; border-radius: 4px; padding: 10px 24px; font-weight: 700; cursor: pointer; }

.loading-progress { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.progress-ring { position: relative; width: 120px; height: 120px; }
.progress-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: #333; stroke-width: 6; }
.ring-fill { fill: none; stroke: #E50914; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
.progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.progress-percent { color: #fff; font-size: 1.6rem; font-weight: 800; }
.loading-title { color: #fff; font-size: 1.3rem; font-weight: 700; text-align: center; max-width: 400px; }
.loading-status { color: #888; font-size: 0.9rem; }
.loading-stats { display: flex; gap: 16px; color: #666; font-size: 0.8rem; }
.loading-stats span { display: flex; align-items: center; gap: 4px; }

.player-container { flex: 1; display: flex; flex-direction: column; position: relative; }
.video-player { width: 100%; height: 85vh; background: #000; outline: none; }

/* Next episode overlay */
.next-overlay { position: absolute; bottom: 100px; right: 40px; background: rgba(0,0,0,0.9); border: 1px solid #333; border-radius: 8px; padding: 20px 24px; z-index: 50; min-width: 280px; }
.next-overlay p { color: #888; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; }
.next-overlay h3 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0 0 14px; }
.next-actions { display: flex; gap: 10px; margin-bottom: 10px; }
.btn-next { display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #000; border: none; border-radius: 4px; padding: 8px 18px; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
.btn-next:hover { opacity: 0.85; }
.btn-dismiss { background: none; border: 1px solid #555; color: #999; border-radius: 4px; padding: 8px 14px; font-size: 0.85rem; cursor: pointer; }
.btn-dismiss:hover { border-color: #999; color: #fff; }
.next-countdown { color: #666; font-size: 0.75rem; }

.player-info { padding: 16px 4%; }
.player-info h1 { color: #fff; font-size: 1.4rem; font-weight: 700; margin-bottom: 6px; }
.player-meta { display: flex; gap: 14px; color: #888; font-size: 0.85rem; align-items: center; }
.rating { color: #f5c518; display: flex; align-items: center; gap: 3px; }
.peers { display: flex; align-items: center; gap: 3px; color: #555; }
</style>
