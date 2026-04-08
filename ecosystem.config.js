module.exports = {
  apps: [
    {
      name: 'discord-music-bot',
      script: 'index.js',
      restart_delay: 5000,      // wait 5s before restarting on crash
      max_restarts: 10,         // give up after 10 rapid crashes
      watch: false,             // don't watch files (set true during dev if you want hot reload)
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
