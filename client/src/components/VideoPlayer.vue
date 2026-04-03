<template>
    <div class="player-page">
        <button class="btn-back" @click="goBack">
            <ArrowLeft :size="20" />
            <span>Back</span>
        </button>

        <!-- Buffering / Loading State -->
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
                        <circle class="ring-fill" cx="60" cy="60" r="52"
                            :stroke-dasharray="327"
                            :stroke-dashoffset="327 - (327 * displayProgress)" />
                    </svg>
                    <div class="progress-text">
                        <span class="progress-percent">{{ Math.round(displayProgress * 100) }}%</span>
                    </div>
                </div>
                <h2 class="loading-title">{{ movie?.title || 'Loading...' }}</h2>
                <p class="loading-status">{{ statusMessage }}</p>
                <div class="loading-stats" v-if="stats.peers > 0">
                    <span><Wifi :size="14" /> {{ stats.peers }} peers</span>
                    <span><ArrowDown :size="14" /> {{ stats.speedFormatted }}</span>
                    <span><HardDrive :size="14" /> {{ stats.downloadedFormatted }} / {{ stats.fileSizeFormatted }}</span>
                </div>
            </div>
        </div>

        <!-- Video Player -->
        <div v-else class="player-container">
            <video
                ref="video"
                class="video-player"
                controls
                autoplay
                :src="streamUrl"
                @error="onVideoError"
            >
                <track
                    v-if="subtitles.en"
                    kind="subtitles"
                    :src="apiBase + subtitles.en"
                    srclang="en"
                    label="English"
                />
                <track
                    v-if="subtitles.fr"
                    kind="subtitles"
                    :src="apiBase + subtitles.fr"
                    srclang="fr"
                    label="French"
                />
            </video>
            <div class="player-info">
                <h1>{{ movie?.title }}</h1>
                <div class="player-meta">
                    <span v-if="movie?.year">{{ movie.year }}</span>
                    <span v-if="movie?.runtime">{{ movie.runtime }}</span>
                    <span v-if="movie?.rating" class="rating">{{ movie.rating }}/10</span>
                    <span v-if="stats.peers > 0" class="peers"><Wifi :size="13" /> {{ stats.peers }} peers</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Api from '@/services/Api';
import { ArrowLeft, AlertCircle, Wifi, ArrowDown, HardDrive } from 'lucide-vue-next';

export default {
    name: 'VideoPlayer',
    components: { ArrowLeft, AlertCircle, Wifi, ArrowDown, HardDrive },
    data() {
        return {
            movie: null,
            ready: false,
            error: null,
            streamUrl: null,
            subtitles: { en: null, fr: null },
            apiBase: 'http://localhost:8081',
            pollTimer: null,
            stats: {
                status: 'connecting',
                progress: 0,
                downloaded: 0,
                downloadedFormatted: '0 B',
                fileSize: 0,
                fileSizeFormatted: '0 B',
                speed: 0,
                speedFormatted: '0 B/s',
                peers: 0,
                fileName: '',
            },
        };
    },
    computed: {
        displayProgress() {
            return this.stats.progress || 0;
        },
        statusMessage() {
            switch (this.stats.status) {
                case 'connecting': return 'Finding peers...';
                case 'buffering': return 'Buffering video...';
                case 'ready': return 'Starting playback...';
                default: return 'Preparing stream...';
            }
        },
    },
    async mounted() {
        await this.loadMovie();
        this.startPrepare();
        this.loadSubtitles();
    },
    beforeUnmount() {
        if (this.pollTimer) clearInterval(this.pollTimer);
    },
    methods: {
        async loadMovie() {
            try {
                const response = await Api().get(`movie/${this.$route.params.id}`);
                this.movie = response.data;
            } catch (err) {
                this.error = 'Failed to load movie info.';
            }
        },
        startPrepare() {
            this.error = null;
            this.ready = false;

            // Start polling /prepare/:id
            this.pollStatus();
            this.pollTimer = setInterval(() => this.pollStatus(), 1500);
        },
        async pollStatus() {
            try {
                const response = await Api().get(`prepare/${this.$route.params.id}`);
                this.stats = response.data;

                if (this.stats.status === 'ready') {
                    clearInterval(this.pollTimer);
                    this.pollTimer = null;
                    this.streamUrl = `${this.apiBase}/stream/${this.$route.params.id}`;
                    this.ready = true;
                } else if (this.stats.status === 'error') {
                    clearInterval(this.pollTimer);
                    this.pollTimer = null;
                    this.error = this.stats.error || 'Failed to prepare stream';
                }
            } catch (err) {
                // Keep polling on network errors
            }
        },
        async loadSubtitles() {
            try {
                const response = await Api().get(`subtitles/${this.$route.params.id}`);
                this.subtitles = response.data;
            } catch (err) {
                // Optional
            }
        },
        onVideoError() {
            // Video element failed — might need more buffer, retry
            if (this.ready) {
                this.error = 'Playback failed. The torrent may need more time to buffer.';
                this.ready = false;
                // Re-poll
                this.startPrepare();
            }
        },
        goBack() {
            if (this.pollTimer) clearInterval(this.pollTimer);
            this.$router.back();
        },
    },
};
</script>

<style scoped>
.player-page {
    background: #000;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.btn-back {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    border-radius: 4px;
    color: #fff;
    padding: 10px 18px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-back:hover { background: rgba(255, 255, 255, 0.15); }

/* Loading */
.player-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
.loading-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: #999;
}
.loading-error p { font-size: 1rem; max-width: 400px; text-align: center; }
.btn-retry {
    background: #E50914;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 10px 24px;
    font-weight: 700;
    cursor: pointer;
}
.btn-retry:hover { background: #f40612; }

.loading-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

/* Progress Ring */
.progress-ring {
    position: relative;
    width: 140px;
    height: 140px;
}
.progress-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}
.ring-bg {
    fill: none;
    stroke: #333;
    stroke-width: 6;
}
.ring-fill {
    fill: none;
    stroke: #E50914;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s ease;
}
.progress-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.progress-percent {
    color: #fff;
    font-size: 1.8rem;
    font-weight: 800;
}

.loading-title {
    color: #fff;
    font-size: 1.4rem;
    font-weight: 700;
    text-align: center;
    max-width: 400px;
}
.loading-status {
    color: #999;
    font-size: 0.95rem;
}
.loading-stats {
    display: flex;
    gap: 20px;
    color: #777;
    font-size: 0.8rem;
}
.loading-stats span {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Player */
.player-container {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.video-player {
    width: 100%;
    height: 85vh;
    background: #000;
    outline: none;
}

.player-info {
    padding: 20px 4%;
}
.player-info h1 {
    color: #fff;
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 8px;
}
.player-meta {
    display: flex;
    gap: 16px;
    color: #999;
    font-size: 0.9rem;
    align-items: center;
}
.rating { color: #46d369; font-weight: 600; }
.peers { display: flex; align-items: center; gap: 4px; color: #777; }
</style>
