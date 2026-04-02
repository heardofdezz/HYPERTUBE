<template>
    <nav class="navbar" :class="{ scrolled: isScrolled }">
        <div class="navbar-left">
            <router-link to="/" class="logo">
                <span class="logo-text">HYPERTUBE</span>
            </router-link>
            <template v-if="isLoggedIn">
                <router-link to="/browse" class="nav-link">Home</router-link>
                <router-link to="/browse" class="nav-link">Movies</router-link>
            </template>
        </div>

        <div class="navbar-right">
            <template v-if="isLoggedIn">
                <div class="search-box" :class="{ active: searchActive }">
                    <v-icon
                        class="search-icon"
                        @click="toggleSearch"
                    >mdi-magnify</v-icon>
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

                <v-menu>
                    <template v-slot:activator="{ props }">
                        <div class="profile-trigger" v-bind="props">
                            <div class="avatar">
                                {{ userInitial }}
                            </div>
                            <v-icon size="small" class="caret">mdi-chevron-down</v-icon>
                        </div>
                    </template>
                    <v-list class="profile-menu" bg-color="#1a1a1a">
                        <v-list-item :to="{ name: 'Profile' }">
                            <v-list-item-title>Profile</v-list-item-title>
                        </v-list-item>
                        <v-list-item :to="{ name: 'Settings' }">
                            <v-list-item-title>Settings</v-list-item-title>
                        </v-list-item>
                        <v-divider></v-divider>
                        <v-list-item @click="logout">
                            <v-list-item-title>Sign out</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>

            <template v-else>
                <router-link to="/login">
                    <v-btn variant="flat" color="#E50914" class="sign-in-btn">Sign In</v-btn>
                </router-link>
            </template>
        </div>
    </nav>
</template>

<script>
export default {
    name: 'AppHeader',
    data() {
        return {
            isScrolled: false,
            searchActive: false,
            searchQuery: '',
        };
    },
    computed: {
        isLoggedIn() {
            return this.$store.state.isUserLoggedIn;
        },
        userInitial() {
            const user = this.$store.state.user;
            if (user && user.username) return user.username.charAt(0).toUpperCase();
            return 'U';
        },
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
        logout() {
            this.$store.dispatch('logout');
            this.$router.push({ name: 'Home' });
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
    font-size: 22px;
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

.profile-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}
.avatar {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    background: #E50914;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
}
.caret {
    color: #fff;
    transition: transform 0.2s;
}

.profile-menu {
    border-radius: 4px;
    border: 1px solid #333;
}

.sign-in-btn {
    text-transform: none;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 4px;
    padding: 0 16px;
}
</style>
