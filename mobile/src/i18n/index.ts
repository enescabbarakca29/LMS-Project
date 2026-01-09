import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, AppLocale, TKey } from "./translations";

const STORAGE_KEY = "lms_locale";

export const i18n = new I18n(translations);
i18n.enableFallback = true;

// cihaz dili
const deviceLang = (Localization.getLocales()?.[0]?.languageCode ?? "tr") as AppLocale;
i18n.locale = ["tr", "en", "de"].includes(deviceLang) ? deviceLang : "tr";

export function t(key: TKey) {
  return i18n.t(key) as string;
}

export async function initLocale() {
  const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as AppLocale | null;
  if (saved) i18n.locale = saved;
}

export async function setLocale(locale: AppLocale) {
  i18n.locale = locale;
  await AsyncStorage.setItem(STORAGE_KEY, locale);
}

export function getLocale(): AppLocale {
  return i18n.locale as AppLocale;
}
