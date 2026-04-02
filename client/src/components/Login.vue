<template>
    <div class="auth-page">
        <div class="auth-bg"></div>
        <div class="auth-container">
            <div class="auth-card">
                <h1>Sign In</h1>

                <div v-if="error" class="auth-error">{{ error }}</div>

                <form @submit.prevent="login" class="auth-form">
                    <div class="input-group">
                        <input
                            v-model="email"
                            type="email"
                            placeholder="Email address"
                            required
                        />
                    </div>
                    <div class="input-group">
                        <input
                            v-model="password"
                            type="password"
                            placeholder="Password"
                            required
                        />
                    </div>
                    <button type="submit" class="btn-submit" :disabled="loading">
                        {{ loading ? 'Signing In...' : 'Sign In' }}
                    </button>
                </form>

                <div class="auth-footer">
                    <p>
                        New to Hypertube?
                        <router-link to="/register" class="auth-link">Sign up now</router-link>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import UsersService from '@/services/UsersService';

export default {
    name: 'LoginPage',
    data() {
        return {
            email: '',
            password: '',
            error: null,
            loading: false,
        };
    },
    methods: {
        async login() {
            this.error = null;
            this.loading = true;
            try {
                const response = await UsersService.login({
                    email: this.email,
                    password: this.password,
                });
                await this.$store.dispatch('setUser', response.data.user);
                await this.$store.dispatch('setToken', response.data.token);
                this.$router.push({ name: 'Browse' });
            } catch (error) {
                this.error = error.response?.data?.error || 'Login failed. Please try again.';
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<style scoped>
.auth-page {
    min-height: 100vh;
    position: relative;
}
.auth-bg {
    position: fixed;
    inset: 0;
    background: url('https://assets.nflxext.com/ffe/siteui/vlv3/93da5c27-be66-427c-8b72-b76c1b5e73b1/94224bf2-09d6-4695-8408-4c89b1f1728e/US-en-20230306-popsignuptwoithcoupon-perspective_alpha_website_large.jpg') center center / cover no-repeat;
    z-index: 0;
}
.auth-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
}

.auth-container {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 68px 24px 24px;
}

.auth-card {
    background: rgba(0, 0, 0, 0.75);
    border-radius: 4px;
    padding: 60px 68px 40px;
    width: 100%;
    max-width: 450px;
}
.auth-card h1 {
    color: #fff;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 28px;
}

.auth-error {
    background: #E87C03;
    color: #fff;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 16px;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.input-group input {
    width: 100%;
    background: #333;
    border: none;
    border-radius: 4px;
    padding: 16px;
    font-size: 1rem;
    color: #fff;
    outline: none;
    transition: background 0.2s;
}
.input-group input:focus {
    background: #454545;
}
.input-group input::placeholder {
    color: #8c8c8c;
}

.btn-submit {
    width: 100%;
    background: #E50914;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 16px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    margin-top: 24px;
    transition: background 0.2s;
}
.btn-submit:hover {
    background: #f40612;
}
.btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.auth-footer {
    margin-top: 40px;
}
.auth-footer p {
    color: #737373;
    font-size: 1rem;
}
.auth-link {
    color: #fff;
    font-weight: 500;
}
.auth-link:hover {
    text-decoration: underline;
}

@media (max-width: 600px) {
    .auth-card {
        padding: 40px 24px 30px;
    }
}
</style>
