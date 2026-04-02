import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store/store';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

const vuetify = createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: { mdi },
    },
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark: {
                dark: true,
                colors: {
                    background: '#141414',
                    surface: '#1a1a1a',
                    primary: '#E50914',
                    secondary: '#564d4d',
                    accent: '#E50914',
                    error: '#E50914',
                    info: '#2196F3',
                    success: '#46d369',
                    warning: '#f9a825',
                },
            },
        },
    },
});

const app = createApp(App);
app.use(router);
app.use(store);
app.use(vuetify);
app.mount('#app');
