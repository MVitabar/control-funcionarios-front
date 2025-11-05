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
  updates: {
    url: 'https://u.expo.dev/a651b883-14e9-42ff-bac1-7a20de320c88',
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    // codeSigningCertificate: './code-signing/certificate.pem',
    // codeSigningMetadata: {
    //   keyid: 'main',
    //   alg: 'rsa-v1_5-sha256'
    // }
  },
  runtimeVersion: {
    policy: 'appVersion'
  },
  extra: {
    eas: {
      projectId: 'a651b883-14e9-42ff-bac1-7a20de320c88'
    },
    API_URL: 'https://control-funcionarios-production.up.railway.app',
    NODE_ENV: 'production'
  }
};
