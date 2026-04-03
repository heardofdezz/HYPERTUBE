module.exports = {
    apps: [
        {
            name: 'hypertube-server',
            script: './src/app.js',
            watch: false,
            autorestart: true,
            max_restarts: 50,
            restart_delay: 5000,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
