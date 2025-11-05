// Load environment variables from .env file
require('dotenv').config({ path: '.env.local' });

module.exports = {
  owner: 'martinvitabar',
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
    eas: {
      projectId: 'a651b883-14e9-42ff-bac1-7a20de320c88'
    },
    API_URL: process.env.API_URL || 'https://control-funcionarios-production.up.railway.app',
    NODE_ENV: process.env.NODE_ENV || 'production'
  }
};
