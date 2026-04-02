import Api from '@/services/Api';

export default {
    MoviesIndex(params) {
        return Api().get('movies', { params });
    },
    Categories() {
        return Api().get('categories');
    },
};
