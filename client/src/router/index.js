import { createRouter, createWebHashHistory } from 'vue-router';
import Index from '@/components/Index.vue';
import Movies from '@/components/Movies.vue';
import MovieDetail from '@/components/MovieDetail.vue';

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
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;
