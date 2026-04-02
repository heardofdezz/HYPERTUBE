import { createStore } from 'vuex';

export default createStore({
    state: {
        token: localStorage.getItem('hypertube-token') || null,
        user: JSON.parse(localStorage.getItem('hypertube-user') || 'null'),
        isUserLoggedIn: !!localStorage.getItem('hypertube-token'),
    },
    mutations: {
        setToken(state, token) {
            state.token = token;
            state.isUserLoggedIn = !!token;
            if (token) {
                localStorage.setItem('hypertube-token', token);
            } else {
                localStorage.removeItem('hypertube-token');
            }
        },
        setUser(state, user) {
            state.user = user;
            if (user) {
                localStorage.setItem('hypertube-user', JSON.stringify(user));
            } else {
                localStorage.removeItem('hypertube-user');
            }
        },
    },
    actions: {
        setToken({ commit }, token) {
            commit('setToken', token);
        },
        setUser({ commit }, user) {
            commit('setUser', user);
        },
        logout({ commit }) {
            commit('setToken', null);
            commit('setUser', null);
        },
    },
    getters: {
        isLoggedIn: (state) => state.isUserLoggedIn,
        currentUser: (state) => state.user,
    },
});
