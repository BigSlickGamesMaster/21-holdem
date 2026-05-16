module.exports = {
  apps: [
    {
      name: '21-holdem-admin-be',
      script: './index.js',
      interpreter: 'node',
      cwd: '/home/ubuntu/TwentyOneHoldemWebGame/21-holdem-admin-be',
      pid_file: './.pm2/pids/21-holdem-admin-be.pid',
      out_file: './.pm2/logs/21-holdem-admin-be.log',
      error_file: './.pm2/logs/21-holdem-admin-be.err',
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
