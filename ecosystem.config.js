module.exports = {
  apps: [
    {
      name: 'cbt-api',
      cwd: '/var/www/html/ujianCBT/backend',
      script: './cbt-server',
      env: {
        APP_PORT: '8080',
        APP_ENV: 'production',
        POSTGRES_URL: 'postgres://cbt_user:cbt_pass@127.0.0.1:5432/cbt_db?sslmode=disable',
        POSTGRES_MAX_CONNS: '100',
        POSTGRES_MIN_CONNS: '10',
        REDIS_URL: '127.0.0.1:6379',
        REDIS_POOL_SIZE: '300',
        JWT_SECRET: 'super-cbt-secret-key-high-concurrency-2026',
      },
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'cbt-worker',
      cwd: '/var/www/html/ujianCBT/backend',
      script: './cbt-worker',
      env: {
        POSTGRES_URL: 'postgres://cbt_user:cbt_pass@127.0.0.1:5432/cbt_db?sslmode=disable',
        REDIS_URL: '127.0.0.1:6379',
        WORKER_BATCH_SIZE: '500',
        WORKER_FLUSH_INTERVAL_MS: '1500',
      },
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'cbt-frontend',
      cwd: '/var/www/html/ujianCBT/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: '/api/v1',
      },
      restart_delay: 2000,
      max_restarts: 10,
    },
  ],
};
