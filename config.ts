import Constants from 'expo-constants';

type EnvConfig = {
  API_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  // Add other environment variables here as needed
};

// Default configuration (production)
const ENV: EnvConfig = {
  API_URL: 'https://control-funcionarios-1406c5819e1f.herokuapp.com',
  NODE_ENV: 'production',
  // Add other default values here
};

// Override with environment variables if they exist (set in app.config.js)
if (Constants.expoConfig?.extra) {
  Object.assign(ENV, Constants.expoConfig.extra);
}

export default ENV;
