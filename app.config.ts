import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isCustomBuild = Boolean(process.env.EAS_BUILD || process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN);

  const plugins: any[] = [
    'expo-router',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'gomzansi uses your location to find nearby taxi ranks and to share live trip progress.',
      },
    ],
  ];

  if (isCustomBuild) {
    try {
      plugins.push([
        '@rnmapbox/maps',
        {
          RNMapboxMapsImpl: 'mapbox',
          RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN,
        },
      ]);
    } catch {
      // Omit if running in standard Expo Go client
    }
  }

  return {
    ...config,
    name: 'gomzansi',
    slug: 'gomzansi',
    scheme: 'gomzansi',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0C3B2E',
    },
    ios: {
      bundleIdentifier: 'app.gomzansi.mobile',
      supportsTablet: false,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'gomzansi uses your location to find nearby taxi ranks and to share live trip progress.',
      },
    },
    android: {
      package: 'app.gomzansi.mobile',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0C3B2E',
      },
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    plugins,
  };
};
