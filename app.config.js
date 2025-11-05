// Load environment variables from .env file
require('dotenv').config({ path: '.env.local' });

module.exports = {
  name: 'Control Funcionarios',
  slug: 'control-funcionarios',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true
  },
  android: {
    package: 'com.tudominio.controlfuncionarios',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#FFFFFF',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png'
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'controlfuncionarios'
          }
        ],
        category: ['BROWSABLE', 'DEFAULT']
      }
    ]
  },
  web: {
    favicon: './assets/images/favicon.png'
  },
  extra: {
    API_URL: process.env.API_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
};
