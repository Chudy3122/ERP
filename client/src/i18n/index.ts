import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pl from './locales/pl.json';
import en from './locales/en.json';
import de from './locales/de.json';

const savedLanguage = localStorage.getItem('erp-language') || 'pl';

// Build resources with both 'translation' (default) namespace and per-section namespaces
function buildResources(data: Record<string, any>) {
  const result: Record<string, any> = { translation: data };
  for (const key of Object.keys(data)) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      result[key] = data[key];
    }
  }
  return result;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: buildResources(pl),
      en: buildResources(en),
      de: buildResources(de),
    },
    lng: savedLanguage,
    fallbackLng: 'pl',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
