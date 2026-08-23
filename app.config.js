export default {
  expo: {
    name: "Моя погода",
    slug: "my-app-final",
    version: "1.0.3",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    assetBundlePatterns: ["**/*"],
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bladvin.myappfinal"
    },
    android: {
      package: "com.bladvin.myappfinal",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      colors: {
        primary: "#023c69",
        primaryDark: "#ffffff",
        background: "#ffffff"
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Приложению 'Моя погода' требуется доступ к геолокации для определения погоды."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "2b5d5c39-a1c2-4959-ad98-da372592df88"
      }
    }
  }
};
