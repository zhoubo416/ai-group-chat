module.exports = {
  apps: [
    {
      name: 'ai-group-chat',
      script: '.output/server/index.mjs',
      cwd: '/home/www/ai-group-chat',
      exec_mode: 'cluster',
      instances: 'max',
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
        NITRO_PORT: 3008,
        NITRO_HOST: '0.0.0.0',
        HOST: '0.0.0.0',
        // 避免服务器环境预置的 --localstorage-file 等 NODE_OPTIONS 影响 Node 进程
        NODE_OPTIONS: ''
      },
      autorestart: true,
      max_restarts: 10,
      unref: true,
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '512M'
    }
  ]
};
