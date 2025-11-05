import Constants from 'expo-constants';

type EnvConfig = {
  API_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  // Add other environment variables here as needed
};

// Default configuration (development)
const ENV: EnvConfig = {
  API_URL: 'http://localhost:3000',
  NODE_ENV: 'development',
  // Add other default values here
};

// Override with environment variables if they exist (set in app.config.js)
if (Constants.expoConfig?.extra) {
  Object.assign(ENV, Constants.expoConfig.extra);
}

export default ENV;
