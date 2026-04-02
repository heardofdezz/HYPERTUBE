<template>
    <div class="detail-page">
        <div v-if="loading" class="detail-loading">
            <div class="spinner"></div>
        </div>

        <template v-else-if="movie">
            <!-- Backdrop Hero -->
            <div class="detail-hero">
                <div class="detail-backdrop" :style="{ backgroundImage: `url(${movie.cover})` }"></div>
                <div class="detail-gradient"></div>
                <div class="detail-hero-content">
                    <button class="btn-back" @click="$router.back()">
                        <v-icon size="20">mdi-arrow-left</v-icon> Back
                    </button>
                    <h1 class="detail-title">{{ movie.title }}</h1>
                    <div class="detail-meta">
                        <span class="detail-match">{{ Math.round((movie.rating || 5) * 10) }}% Match</span>
                        <span>{{ movie.year }}</span>
                        <span v-if="movie.runtime">{{ movie.runtime }}</span>
                        <span v-if="movie.country">{{ movie.country }}</span>
                    </div>
                    <div class="detail-actions">
                        <button class="btn-play-large">
                            <v-icon size="28">mdi-play</v-icon> Play
                        </button>
                    </div>
                </div>
            </div>

            <!-- Details Body -->
            <div class="detail-body">
                <div class="detail-main">
                    <p class="detail-summary">{{ movie.summary }}</p>
                </div>
                <div class="detail-sidebar">
                    <p v-if="movie.director">
                        <span class="label">Director:</span> {{ movie.director }}
                    </p>
                    <p v-if="movie.actors">
                        <span class="label">Cast:</span> {{ movie.actors }}
                    </p>
                    <p v-if="movie.writer">
                        <span class="label">Writer:</span> {{ movie.writer }}
                    </p>
                    <p v-if="movie.genres && movie.genres.length">
                        <span class="label">Genres:</span> {{ movie.genres.join(', ') }}
                    </p>
                </div>
            </div>

            <!-- Comments Section -->
            <div class="comments-section">
                <h2>Comments</h2>
                <form @submit.prevent="addComment" class="comment-form">
                    <input
                        v-model="newComment"
                        type="text"
                        placeholder="Add a comment..."
                        class="comment-input"
                    />
                    <button type="submit" class="btn-comment" :disabled="!newComment.trim()">Post</button>
                </form>
                <div class="comments-list">
                    <div
                        v-for="(comment, index) in (movie.comments || [])"
                        :key="index"
                        class="comment-item"
                    >
                        <div class="comment-avatar">
                            <v-icon size="18" color="#fff">mdi-account</v-icon>
                        </div>
                        <div class="comment-body">
                            <p class="comment-content">{{ comment.content }}</p>
                        </div>
                    </div>
                    <p v-if="!movie.comments || movie.comments.length === 0" class="no-comments">
                        No comments yet. Be the first!
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import Api from '@/services/Api';

export default {
    name: 'MovieDetail',
    data() {
        return {
            movie: null,
            loading: true,
            newComment: '',
        };
    },
    async mounted() {
        await this.fetchMovie();
    },
    methods: {
        async fetchMovie() {
            this.loading = true;
            try {
                const response = await Api().get('movies?limit=100');
                const movies = response.data || [];
                this.movie = movies.find((m) => m._id === this.$route.params.id) || null;
            } catch (err) {
                console.error('Failed to load movie:', err);
            } finally {
                this.loading = false;
            }
        },
        async addComment() {
            if (!this.newComment.trim()) return;
            try {
                await Api().post(`comment/${this.movie._id}`, {
                    content: this.newComment,
                });
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
.detail-page {
    background: #141414;
    min-height: 100vh;
}

.detail-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
.spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #333;
    border-top-color: #E50914;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.detail-hero {
    position: relative;
    height: 70vh;
    min-height: 450px;
    display: flex;
    align-items: flex-end;
    padding: 0 4% 5%;
}
.detail-backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.4);
}
.detail-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 30%, #141414 100%);
}
.detail-hero-content {
    position: relative;
    z-index: 2;
    max-width: 600px;
}

.btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.1);
    border: none;
    border-radius: 4px;
    color: #fff;
    padding: 8px 16px;
    font-size: 0.85rem;
    cursor: pointer;
    margin-bottom: 20px;
    transition: background 0.2s;
}
.btn-back:hover { background: rgba(255,255,255,0.2); }

.detail-title {
    font-size: 3rem;
    font-weight: 900;
    color: #fff;
    margin-bottom: 12px;
    text-shadow: 2px 2px 8px rgba(0,0,0,0.6);
}
.detail-meta {
    display: flex;
    gap: 14px;
    color: #ddd;
    font-size: 0.95rem;
    margin-bottom: 20px;
}
.detail-match {
    color: #46d369;
    font-weight: 700;
}

.btn-play-large {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 4px;
    padding: 12px 36px;
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
}
.btn-play-large:hover { opacity: 0.8; }

.detail-body {
    display: flex;
    gap: 40px;
    padding: 40px 4%;
    max-width: 1200px;
}
.detail-main { flex: 2; }
.detail-summary {
    color: #ddd;
    font-size: 1.05rem;
    line-height: 1.6;
}
.detail-sidebar { flex: 1; }
.detail-sidebar p {
    color: #999;
    font-size: 0.9rem;
    margin-bottom: 10px;
    line-height: 1.5;
}
.label { color: #777; }

.comments-section {
    padding: 40px 4%;
    max-width: 1200px;
    border-top: 1px solid #333;
}
.comments-section h2 {
    color: #fff;
    font-size: 1.4rem;
    margin-bottom: 20px;
}
.comment-form {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
}
.comment-input {
    flex: 1;
    background: #333;
    border: none;
    border-radius: 4px;
    padding: 12px 16px;
    color: #fff;
    font-size: 0.95rem;
    outline: none;
}
.comment-input::placeholder { color: #888; }
.comment-input:focus { background: #404040; }

.btn-comment {
    background: #E50914;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 12px 24px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
}
.btn-comment:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-comment:hover:not(:disabled) { background: #f40612; }

.comment-item {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}
.comment-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.comment-content {
    color: #ddd;
    font-size: 0.95rem;
    line-height: 1.4;
    padding-top: 8px;
}
.no-comments {
    color: #666;
    font-style: italic;
}

@media (max-width: 768px) {
    .detail-title { font-size: 1.8rem; }
    .detail-body { flex-direction: column; gap: 20px; }
}
</style>
