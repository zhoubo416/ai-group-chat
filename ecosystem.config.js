module.exports = {
  apps: [
    {
      name: 'ai-group-chat',
      script: '.output/server/index.mjs',
      exec_mode: 'cluster',
      instances: 'max',
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
        NITRO_PORT: 3008,
        HOST: '0.0.0.0',
      },
      // 自动重启与健壮性
      autorestart: true,
      max_restarts: 10,
      // 若用于作为后台服务，避免阻塞父进程
      unref: true,
      // 日志
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 资源保护
      max_memory_restart: '512M'
    }
  ]
};