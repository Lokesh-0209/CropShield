import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import kn from './locales/kn.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('cropshield_language') || 'en' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kn: { translation: kn },
      hi: { translation: hi },
      te: { translation: te },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export function setLanguage(lang) {
  if (['en', 'kn', 'hi', 'te'].includes(lang)) {
    i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cropshield_language', lang);
    }
  }
}

export default i18n;
