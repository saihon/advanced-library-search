export const DEFAULT_THEME = "light";
export const DEFAULT_DEBOUNCE_TIME = 300;
const DEFAULT_SEARCH_ON_ENTER = false;

/**
 * Loads extension settings from local storage.
 * @returns {Promise<object>} A promise that resolves to an object containing the settings.
 */
export async function loadSettings() {
  try {
    const settings = await browser.storage.local.get([
      "theme",
      "debounceTime",
      "searchOnEnter",
    ]);

    const debounceTime =
      settings.debounceTime !== undefined
        ? parseInt(settings.debounceTime, 10)
        : DEFAULT_DEBOUNCE_TIME;

    return {
      theme: settings.theme || DEFAULT_THEME,
      debounceTime:
        !isNaN(debounceTime) && debounceTime >= 0
          ? debounceTime
          : DEFAULT_DEBOUNCE_TIME,
      searchOnEnter:
        settings.searchOnEnter !== undefined
          ? settings.searchOnEnter
          : DEFAULT_SEARCH_ON_ENTER,
    };
  } catch (e) {
    console.error("Error loading extension settings:", e);
    // Return default settings in case of an error
    return {
      theme: DEFAULT_THEME,
      debounceTime: DEFAULT_DEBOUNCE_TIME,
      searchOnEnter: DEFAULT_SEARCH_ON_ENTER,
    };
  }
}

export async function saveSetting(key, value) {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch (e) {
    console.error(`Error saving setting ${key}:`, e);
    throw e; // Re-throw to allow caller to handle
  }
}
