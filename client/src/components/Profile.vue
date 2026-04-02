<template>
    <div class="profile-page">
        <div class="profile-container">
            <h1>Profile</h1>

            <div class="profile-card" v-if="user">
                <div class="profile-avatar">
                    {{ userInitial }}
                </div>
                <div class="profile-info">
                    <div class="info-row">
                        <span class="info-label">Username</span>
                        <span class="info-value">{{ user.username }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email</span>
                        <span class="info-value">{{ user.email }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">First Name</span>
                        <span class="info-value">{{ user.firstname }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Last Name</span>
                        <span class="info-value">{{ user.lastname }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Member Since</span>
                        <span class="info-value">{{ formatDate(user.created) }}</span>
                    </div>
                </div>
            </div>

            <div class="profile-actions">
                <router-link to="/settings">
                    <button class="btn-settings">
                        <v-icon size="18">mdi-cog</v-icon> Account Settings
                    </button>
                </router-link>
                <button class="btn-signout" @click="logout">
                    <v-icon size="18">mdi-logout</v-icon> Sign Out
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ProfilePage',
    computed: {
        user() {
            return this.$store.state.user;
        },
        userInitial() {
            return this.user?.username?.charAt(0).toUpperCase() || 'U';
        },
    },
    methods: {
        formatDate(dateStr) {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        },
        logout() {
            this.$store.dispatch('logout');
            this.$router.push({ name: 'Home' });
        },
    },
};
</script>

<style scoped>
.profile-page {
    background: #141414;
    min-height: 100vh;
    padding: 100px 4% 60px;
}
.profile-container {
    max-width: 700px;
    margin: 0 auto;
}
.profile-container h1 {
    color: #fff;
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 32px;
}

.profile-card {
    display: flex;
    gap: 32px;
    background: #1a1a1a;
    border-radius: 8px;
    padding: 32px;
    margin-bottom: 32px;
}
.profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    background: #E50914;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 900;
    flex-shrink: 0;
}
.profile-info {
    flex: 1;
}
.info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #333;
}
.info-row:last-child { border-bottom: none; }
.info-label {
    color: #777;
    font-size: 0.9rem;
}
.info-value {
    color: #fff;
    font-size: 0.9rem;
    font-weight: 500;
}

.profile-actions {
    display: flex;
    gap: 12px;
}
.btn-settings {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #333;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 12px 24px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-settings:hover { background: #444; }
.btn-signout {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: #999;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 12px 24px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-signout:hover {
    color: #fff;
    border-color: #fff;
}

@media (max-width: 600px) {
    .profile-card { flex-direction: column; align-items: center; text-align: center; }
    .info-row { flex-direction: column; gap: 4px; text-align: left; }
    .profile-actions { flex-direction: column; }
}
</style>
