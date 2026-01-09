import Constants from "expo-constants";

// Expo host: "192.168.xxx.xxx:8081"
const hostUri =
  Constants.expoConfig?.hostUri ||
  (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
  (Constants as any).manifest?.hostUri;

const devHost = hostUri?.split(":")?.[0];

// Dev’de otomatik PC IP + 3005, prod’da sabit yazarsın
export const API_BASE_URL = devHost
  ? `http://${devHost}:3005`
  : "http://192.168.202.51:3005";
