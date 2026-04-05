<template>
    <nav class="navbar" :class="{ scrolled: isScrolled }">
        <div class="navbar-left">
            <router-link to="/" class="logo">
                <span class="logo-text">HYPERTUBE</span>
            </router-link>
            <router-link to="/browse" class="nav-link">Home</router-link>
            <router-link to="/browse?type=movie" class="nav-link">Movies</router-link>
            <router-link to="/browse?type=series" class="nav-link">TV Shows</router-link>
            <router-link to="/browse?category=Animation" class="nav-link">Anime</router-link>
        </div>

        <div class="navbar-right">
            <div class="search-box" :class="{ active: searchActive }">
                <Search
                    class="search-icon"
                    :size="20"
                    @click="toggleSearch"
                />
                <input
                    v-if="searchActive"
                    ref="searchInput"
                    v-model="searchQuery"
                    class="search-input"
                    placeholder="Titles, people, genres"
                    @blur="closeSearch"
                    @keyup.enter="doSearch"
                />
            </div>
        </div>
    </nav>
</template>

<script>
import { Search } from 'lucide-vue-next';

export default {
    name: 'AppHeader',
    components: { Search },
    data() {
        return {
            isScrolled: false,
            searchActive: false,
            searchQuery: '',
        };
    },
    mounted() {
        window.addEventListener('scroll', this.handleScroll);
    },
    beforeUnmount() {
        window.removeEventListener('scroll', this.handleScroll);
    },
    methods: {
        handleScroll() {
            this.isScrolled = window.scrollY > 10;
        },
        toggleSearch() {
            this.searchActive = !this.searchActive;
            if (this.searchActive) {
                this.$nextTick(() => {
                    this.$refs.searchInput && this.$refs.searchInput.focus();
                });
            }
        },
        closeSearch() {
            if (!this.searchQuery) {
                this.searchActive = false;
            }
        },
        doSearch() {
            if (this.searchQuery.trim()) {
                this.$router.push({ name: 'Browse', query: { q: this.searchQuery } });
            }
        },
    },
};
</script>

<style scoped>
.navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4%;
    height: 68px;
    background: linear-gradient(180deg, rgba(0,0,0,0.7) 10%, transparent);
    transition: background-color 0.4s ease;
}
.navbar.scrolled {
    background: #141414;
}

.navbar-left, .navbar-right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.logo-text {
    color: #E50914;
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: 2px;
    cursor: pointer;
}

.nav-link {
    color: #e5e5e5;
    font-size: 0.9rem;
    font-weight: 400;
    transition: color 0.3s;
}
.nav-link:hover {
    color: #b3b3b3;
}

.search-box {
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    transition: all 0.3s ease;
}
.search-box.active {
    border-color: #fff;
    background: rgba(0,0,0,0.75);
    padding: 2px 8px;
}
.search-icon {
    color: #fff;
    cursor: pointer;
}
.search-input {
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 0.85rem;
    width: 200px;
    padding: 6px 8px;
}
.search-input::placeholder {
    color: #999;
}
</style>
