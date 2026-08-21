export default {
  "expo": {
    "name": "Моя погода",
    "slug": "my-app-final",
    "version": "1.0.2",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.bladvin.myappfinal"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.bladvin.myappfinal",
      "permissions": [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Приложению 'Моя погода' требуется доступ к геолокации для определения погоды в вашем регионе."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "2b5d5c39-a1c2-4959-ad98-da372592df88"
      }
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/2b5d5c39-a1c2-4959-ad98-da372592df88"
    }
  }
};