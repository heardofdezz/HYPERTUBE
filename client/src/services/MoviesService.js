import Api from '@/services/Api';

export default {
    MoviesIndex(params) {
        return Api().get('movies', { params });
    },
    Categories() {
        return Api().get('categories');
    },
    Search(params) {
        return Api().get('search', { params });
    },
};
