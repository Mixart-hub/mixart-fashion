module.exports = {
  apps: [
    {
      name: 'mixart-api',
      script: './backend/src/server.js',
      cwd: '/var/www/mixart',
      env_production: {
        NODE_ENV: 'production',
      },
      // .env.node.production faylidan o'qiladi (server.js'da dotenv bor)
      // PM2 restart strategy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Logging
      out_file: '/var/log/mixart/api-out.log',
      error_file: '/var/log/mixart/api-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Cluster mode (ixtiyoriy — Socket.io sticky sessions kerak bo'ladi)
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
