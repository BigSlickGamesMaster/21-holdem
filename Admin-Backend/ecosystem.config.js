module.exports = {
  apps: [
    {
      name: 'Poker-jack-admin-be',
      script: './index.js',
      interpreter: 'node',
      cwd: '/home/ubuntu/PokerJackWebGame/Poker-jack-admin-be',
      pid_file: './.pm2/pids/poker-jack-admin-be.pid',
      out_file: './.pm2/logs/poker-jack-admin-be.log',
      error_file: './.pm2/logs/poker-jack-admin-be.err',
      log_date_format: 'DD-MM-YYYY HH:mm:ss SSS',
      merge_logs: true,
      watch: true,
      kill_timeout: 10000,
      max_memory_restart: '900M',
      autorestart: false,
      exec_mode: 'fork',
      instances: 1,
      env: {
        DOTENV_CONFIG_PATH: '.env' // Optional: You can add any custom env variable if needed
      }
    }
  ]
};
