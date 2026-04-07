import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inktrix.app',
  appName: 'Inktrix',
  webDir: 'dist',

  server: {
    // url: 'http://10.0.2.2:5173', // emulator fix
    cleartext: true,
  },

  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '181046189807-6qnj0ksivgetpgvfpucrpkt3v0f0q96d.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;