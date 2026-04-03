<template>
    <div class="player-page">
        <!-- Back button -->
        <button class="btn-back" @click="$router.back()">
            <ArrowLeft :size="20" />
            <span>Back to Browse</span>
        </button>

        <!-- Loading state -->
        <div v-if="loading" class="player-loading">
            <div class="spinner"></div>
            <p>{{ loadingMessage }}</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="player-error">
            <AlertCircle :size="48" color="#E50914" />
            <p>{{ error }}</p>
            <button class="btn-retry" @click="startStream">Try Again</button>
        </div>

        <!-- Video player -->
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
                    :src="subtitleBaseUrl + subtitles.en"
                    srclang="en"
                    label="English"
                />
                <track
                    v-if="subtitles.fr"
                    kind="subtitles"
                    :src="subtitleBaseUrl + subtitles.fr"
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
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Api from '@/services/Api';
import { ArrowLeft, AlertCircle } from 'lucide-vue-next';

export default {
    name: 'VideoPlayer',
    components: { ArrowLeft, AlertCircle },
    data() {
        return {
            movie: null,
            loading: true,
            loadingMessage: 'Loading movie...',
            error: null,
            streamUrl: null,
            subtitles: { en: null, fr: null },
            subtitleBaseUrl: 'http://localhost:8081',
        };
    },
    async mounted() {
        await this.loadMovie();
        await this.startStream();
        this.loadSubtitles();
    },
    methods: {
        async loadMovie() {
            try {
                const response = await Api().get(`movie/${this.$route.params.id}`);
                this.movie = response.data;
                if (!this.movie.hasMagnet) {
                    this.error = 'No torrent sources available for this movie.';
                    this.loading = false;
                }
            } catch (err) {
                this.error = 'Failed to load movie info.';
                this.loading = false;
            }
        },
        async startStream() {
            if (this.error && !this.movie?.hasMagnet) return;

            this.loading = true;
            this.error = null;
            this.loadingMessage = 'Connecting to torrent swarm...';

            // The stream URL points directly to the server endpoint
            // The video element will make range requests as needed
            this.streamUrl = `http://localhost:8081/stream/${this.$route.params.id}`;

            // Give the torrent engine a moment to start, then show the player
            // The video element handles buffering natively
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        },
        async loadSubtitles() {
            try {
                const response = await Api().get(`subtitles/${this.$route.params.id}`);
                this.subtitles = response.data;
            } catch (err) {
                // Subtitles are optional
            }
        },
        onVideoError() {
            if (!this.loading) {
                this.error = 'Failed to play video. The torrent may still be loading — try again in a moment.';
                this.streamUrl = null;
            }
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
.btn-back span { opacity: 0; transition: opacity 0.2s; }
.btn-back:hover span { opacity: 1; }

.player-loading, .player-error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: #999;
}
.spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #333;
    border-top-color: #E50914;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.player-error p { font-size: 1.1rem; max-width: 400px; text-align: center; }
.btn-retry {
    background: #E50914;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 10px 24px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-retry:hover { background: #f40612; }

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
.video-player::-webkit-media-controls-panel {
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
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
}
.rating {
    color: #46d369;
    font-weight: 600;
}
</style>
