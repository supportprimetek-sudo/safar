import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.safar.rider',
  appName: 'SAFAR Rider',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
