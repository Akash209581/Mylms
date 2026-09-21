// PM2 Configuration for Deployment at /data/Mylms
module.exports = {
  apps: [
    {
      name: 'lms-frontend',
      cwd: '/data/Mylms/lms-frontend',
      script: 'npm',
      args: 'start -- -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_BASE_PATH: '/mmadastemlab',
        NEXT_PUBLIC_API_URL: 'https://160.187.169.41/api'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'lms-backend',
      cwd: '/data/Mylms/LMS-backend',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        UPLOADS_DIR: '/data/Mylms/LMS-backend/uploads',
        FRONTEND_URL: 'https://160.187.169.41',
        CORS_ORIGINS: 'https://160.187.169.41,http://160.187.169.41'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'lms-compiler',
      cwd: '/data/Mylms/compiler',
      script: 'app.py',
      interpreter: 'python3',
      env: {
        PORT: 5000,
        PYTHONUNBUFFERED: '1'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
