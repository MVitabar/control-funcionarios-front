// Production configuration
const API_CONFIG = {
  API_URL: 'https://control-funcionarios-production.up.railway.app',
  NODE_ENV: 'production' as const,
};

// Log the configuration for debugging
console.log('API Configuration:', JSON.stringify(API_CONFIG, null, 2));

export default API_CONFIG;
