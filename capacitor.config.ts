import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mddravenapp.app',
  appName: 'MDD Raven',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
