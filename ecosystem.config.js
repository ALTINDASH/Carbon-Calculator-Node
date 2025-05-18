module.exports = {
  apps: [{
    name: "carbon-calculator",
    script: "./dist/server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000,
    env: {
      NODE_ENV: "production",
      PORT: 3005
    },
    env_development: {
      NODE_ENV: "development",
      PORT: 3005
    }
  }]
}; 