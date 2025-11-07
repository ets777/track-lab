import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env['APP_ENV'] === 'dev';

const config: CapacitorConfig = {
    appId: isDev ? 'com.etsbox.tracklab.dev' : 'com.etsbox.tracklab',
    appName: isDev ? 'track-lab-dev' : 'track-lab',
    webDir: 'www',
    android: {
        flavor: 'dev',
    },
};

export default config;
