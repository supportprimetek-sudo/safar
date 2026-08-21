import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.safar.admin',
  appName: 'SAFAR Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
