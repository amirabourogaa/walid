import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c993c9308be743b581b3249163b95ef8',
  appName: 'تونس للإستشارات والمساعدة',
  webDir: 'dist',
  server: {
    url: 'https://c993c930-8be7-43b5-81b3-249163b95ef8.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af',
      showSpinner: true,
      spinnerColor: '#f59e0b'
    }
  }
};

export default config;