import { createRouter, createWebHashHistory } from 'vue-router';
import Index from '@/components/Index.vue';
import Login from '@/components/Login.vue';
import Register from '@/components/Register.vue';
import Movies from '@/components/Movies.vue';
import MovieDetail from '@/components/MovieDetail.vue';
import Settings from '@/components/Settings.vue';
import Profile from '@/components/Profile.vue';
import store from '@/store/store';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Index,
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
    {
        path: '/register',
        name: 'Register',
        component: Register,
    },
    {
        path: '/browse',
        name: 'Browse',
        component: Movies,
        meta: { requiresAuth: true },
    },
    {
        path: '/movie/:id',
        name: 'MovieDetail',
        component: MovieDetail,
        meta: { requiresAuth: true },
    },
    {
        path: '/settings',
        name: 'Settings',
        component: Settings,
        meta: { requiresAuth: true },
    },
    {
        path: '/profile',
        name: 'Profile',
        component: Profile,
        meta: { requiresAuth: true },
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !store.state.isUserLoggedIn) {
        next({ name: 'Login' });
    } else {
        next();
    }
});

export default router;
