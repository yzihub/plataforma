module.exports = {
  apps: [
    {
      name: "jurema-cognitive-runtime",
      script: "npm",
      args: "run start:runtime",
      cwd: __dirname,
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      exp_backoff_restart_delay: 1000,
      min_uptime: "30s",
      max_restarts: 10,
      kill_timeout: 15000,
      listen_timeout: 10000,
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
