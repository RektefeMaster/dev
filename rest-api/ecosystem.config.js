/**
 * PM2 Ecosystem Configuration for Production
 */

module.exports = {
  apps: [
    {
      name: 'rektefe-api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process Management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Memory Management
      max_memory_restart: '1G',
      
      // Health Check
      health_check_grace_period: 3000,
      
      // Advanced Settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Monitoring
      pmx: true,
      
      // Source Map Support
      source_map_support: true,
      
      // Watch (disabled in production)
      watch: false,
      
      // Ignore Watch
      ignore_watch: [
        'node_modules',
        'logs',
        'backups',
        'uploads'
      ]
    }
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/rektefe-api.git',
      path: '/var/www/rektefe-api',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
