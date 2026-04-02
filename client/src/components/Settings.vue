<template>
    <div class="settings-page">
        <div class="settings-container">
            <h1>Account Settings</h1>

            <div class="settings-section">
                <h2>Membership & Billing</h2>
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-value" v-if="user">{{ user.email }}</span>
                        <span class="setting-label">Email</span>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-value">Password: ********</span>
                        <span class="setting-label">Last changed: N/A</span>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h2>Profile</h2>
                <div class="setting-row">
                    <div class="profile-edit">
                        <div class="edit-avatar">{{ userInitial }}</div>
                        <div class="edit-info">
                            <span class="setting-value" v-if="user">{{ user.username }}</span>
                            <span class="setting-label">
                                {{ user?.firstname }} {{ user?.lastname }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h2>Playback</h2>
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-value">Auto-play next episode</span>
                        <span class="setting-label">Enabled</span>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-value">Data usage per screen</span>
                        <span class="setting-label">Auto</span>
                    </div>
                </div>
            </div>

            <div class="settings-footer">
                <button class="btn-signout" @click="logout">
                    <v-icon size="18">mdi-logout</v-icon> Sign Out of All Devices
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'SettingsPage',
    computed: {
        user() {
            return this.$store.state.user;
        },
        userInitial() {
            return this.user?.username?.charAt(0).toUpperCase() || 'U';
        },
    },
    methods: {
        logout() {
            this.$store.dispatch('logout');
            this.$router.push({ name: 'Home' });
        },
    },
};
</script>

<style scoped>
.settings-page {
    background: #141414;
    min-height: 100vh;
    padding: 100px 4% 60px;
}
.settings-container {
    max-width: 800px;
    margin: 0 auto;
}
.settings-container h1 {
    color: #fff;
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #333;
}

.settings-section {
    margin-bottom: 32px;
}
.settings-section h2 {
    color: #999;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
}
.setting-row {
    padding: 16px 0;
    border-bottom: 1px solid #262626;
}
.setting-row:last-child { border-bottom: none; }
.setting-info { }
.setting-value {
    color: #fff;
    font-size: 0.95rem;
    display: block;
    margin-bottom: 4px;
}
.setting-label {
    color: #777;
    font-size: 0.8rem;
}

.profile-edit {
    display: flex;
    align-items: center;
    gap: 16px;
}
.edit-avatar {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    background: #E50914;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 900;
}

.settings-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #333;
}
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
</style>
