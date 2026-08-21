import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.safar.driver',
  appName: 'SAFAR Driver',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
