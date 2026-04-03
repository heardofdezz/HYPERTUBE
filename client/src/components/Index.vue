<template>
    <div class="landing">
        <!-- Hero Section -->
        <div class="hero">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1 class="hero-title">Unlimited movies, TV shows, and more</h1>
                <p class="hero-subtitle">Watch anywhere. Stream anytime. Completely free.</p>
                <div class="hero-actions">
                    <router-link :to="{ name: 'Browse' }">
                        <button class="btn-primary btn-large">
                            Start Watching
                            <ChevronRight :size="24" />
                        </button>
                    </router-link>
                </div>
            </div>
        </div>

        <!-- Divider -->
        <div class="section-divider"></div>

        <!-- Features Section -->
        <div class="features">
            <div class="feature-row">
                <div class="feature-text">
                    <h2>Enjoy on your TV</h2>
                    <p>Watch on Smart TVs, Playstation, Xbox, Chromecast, Apple TV, Blu-ray players, and more.</p>
                </div>
                <div class="feature-visual">
                    <Tv :size="120" color="#E50914" :stroke-width="1" />
                </div>
            </div>

            <div class="section-divider"></div>

            <div class="feature-row reverse">
                <div class="feature-text">
                    <h2>Download your shows to watch offline</h2>
                    <p>Save your favorites easily and always have something to watch.</p>
                </div>
                <div class="feature-visual">
                    <Download :size="120" color="#E50914" :stroke-width="1" />
                </div>
            </div>

            <div class="section-divider"></div>

            <div class="feature-row">
                <div class="feature-text">
                    <h2>Watch everywhere</h2>
                    <p>Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV.</p>
                </div>
                <div class="feature-visual">
                    <Smartphone :size="120" color="#E50914" :stroke-width="1" />
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="section-divider"></div>
        <div class="landing-footer">
            <p class="footer-text">Questions? Contact us.</p>
            <div class="footer-links">
                <a href="#">FAQ</a>
                <a href="#">Help Center</a>
                <a href="#">Terms of Use</a>
                <a href="#">Privacy</a>
            </div>
        </div>
    </div>
</template>

<script>
import { ChevronRight, Tv, Download, Smartphone } from 'lucide-vue-next';

export default {
    name: 'LandingPage',
    components: { ChevronRight, Tv, Download, Smartphone },
};
</script>

<style scoped>
.landing { background: #000; min-height: 100vh; }

.hero {
    position: relative;
    height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: url('https://assets.nflxext.com/ffe/siteui/vlv3/93da5c27-be66-427c-8b72-b76c1b5e73b1/94224bf2-09d6-4695-8408-4c89b1f1728e/US-en-20230306-popsignuptwoithcoupon-perspective_alpha_website_large.jpg') center center / cover no-repeat;
}
.hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 100%);
}
.hero-content { position: relative; z-index: 2; max-width: 740px; padding: 0 24px; }
.hero-title { font-size: 3.2rem; font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 16px; }
.hero-subtitle { font-size: 1.5rem; color: #fff; font-weight: 400; margin-bottom: 28px; }
.hero-actions { display: flex; justify-content: center; }

.btn-primary {
    background: #E50914; color: #fff; border: none; padding: 16px 40px;
    font-size: 1.5rem; font-weight: 600; border-radius: 4px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s;
}
.btn-primary:hover { background: #f40612; }

.section-divider { height: 8px; background: #232323; }

.features { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
.feature-row { display: flex; align-items: center; justify-content: space-between; padding: 60px 0; gap: 48px; }
.feature-row.reverse { flex-direction: row-reverse; }
.feature-text { flex: 1; }
.feature-text h2 { font-size: 2.8rem; font-weight: 900; color: #fff; margin-bottom: 16px; }
.feature-text p { font-size: 1.3rem; color: #ccc; line-height: 1.5; }
.feature-visual { flex: 1; display: flex; justify-content: center; align-items: center; }

.landing-footer { padding: 60px 4% 40px; max-width: 1100px; margin: 0 auto; }
.footer-text { color: #999; font-size: 1rem; margin-bottom: 24px; }
.footer-links { display: flex; flex-wrap: wrap; gap: 16px; }
.footer-links a { color: #737373; font-size: 0.85rem; }
.footer-links a:hover { text-decoration: underline; }

@media (max-width: 768px) {
    .hero-title { font-size: 2rem; }
    .hero-subtitle { font-size: 1.1rem; }
    .feature-row, .feature-row.reverse { flex-direction: column; text-align: center; }
    .feature-text h2 { font-size: 1.8rem; }
    .feature-text p { font-size: 1rem; }
}
</style>
