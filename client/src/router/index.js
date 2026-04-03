import { createRouter, createWebHistory } from 'vue-router';
import Index from '@/components/Index.vue';
import Movies from '@/components/Movies.vue';
import MovieDetail from '@/components/MovieDetail.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Index,
    },
    {
        path: '/browse',
        name: 'Browse',
        component: Movies,
    },
    {
        path: '/movie/:id',
        name: 'MovieDetail',
        component: MovieDetail,
    },
    {
        path: '/watch/:id',
        name: 'Watch',
        component: VideoPlayer,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
