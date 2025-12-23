export const translations = {
  en: {
    appTitle: "Solar Cycle",
    locating: "Locating...",
    themeLabel: "Theme:",
    yearLabel: "Year:",
    dateLabel: "Date:",
    acquiringLocation: "Acquiring location...",
    locationRequired: "Location Required",
    locationError: "Unable to retrieve your location",
    permissionError: "Location permission denied. Please enable location access to see solar data.",
    retry: "Retry",
    daylightHours: "Daylight Hours",
    hoverInstruction: "Hover bars for exact times",
    themes: {
      amber: "Sun",
      sky: "Ocean",
      emerald: "Forest",
      rose: "Rose",
      slate: "Ink"
    },
    tooltip: {
      sunrise: "Sunrise:",
      sunset: "Sunset:",
      daylight: "Daylight:"
    }
  },
  da: {
    appTitle: "Solcyklus",
    locating: "Finder placering...",
    themeLabel: "Tema:",
    yearLabel: "År:",
    dateLabel: "Dato:",
    acquiringLocation: "Henter placering...",
    locationRequired: "Placering påkrævet",
    locationError: "Kunne ikke hente din placering",
    permissionError: "Placeringstilladelse nægtet. Aktiver venligst placeringsadgang for at se data.",
    retry: "Prøv igen",
    daylightHours: "Dagslystimer",
    hoverInstruction: "Hold musen over for præcise tider",
    themes: {
      amber: "Sol",
      sky: "Ocean",
      emerald: "Skov",
      rose: "Rose",
      slate: "Blæk"
    },
    tooltip: {
      sunrise: "Sol op:",
      sunset: "Sol ned:",
      daylight: "Dagslys:"
    }
  }
};

export type Language = 'en' | 'da';
export type Translation = typeof translations.en;

export function getSystemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  // Check if language starts with 'da' (e.g. da-DK)
  const lang = navigator.language.split('-')[0];
  return lang === 'da' ? 'da' : 'en';
}