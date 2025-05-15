import { DEFAULT_THEME } from "./settingsService.js";

const THEME_SELECTOR_ID = "themeSelector";
let discoveredThemes = []; // {id: string, name: string, className: string}

/**
 * Reads available themes from the <link> tags in HTML and updates the discoveredThemes array.
 */
function discoverAvailableThemes() {
  const themeLinks = document.querySelectorAll(
    'link[rel="stylesheet"][data-theme-id][data-theme-name][data-theme-class]'
  );
  discoveredThemes = Array.from(themeLinks).map((link) => ({
    id: link.dataset.themeId,
    name: link.dataset.themeName,
    className: link.dataset.themeClass,
  }));

  if (discoveredThemes.length === 0) {
    console.warn(
      "Theme definition <link> tags with required data attributes (data-theme-id, data-theme-name, data-theme-class) were not found. Theming will be limited."
    );
  }
}

/**
 * Dynamically populates a theme-selecting <select> element with options.
 * @param {HTMLSelectElement} selectorElement - A select element for theme selection.
 */
function populateThemeSelector(selectorElement) {
  if (!selectorElement) return;

  if (discoveredThemes.length === 0) {
    console.warn("Cannot populate theme selector: No themes discovered.");
    selectorElement.style.display = "none";
    const label = document.querySelector(`label[for="${selectorElement.id}"]`);
    if (label) label.style.display = "none";
    return;
  }

  selectorElement.innerHTML = ""; // Clear all options
  discoveredThemes.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.name;
    selectorElement.appendChild(option);
  });
}

/**
 * Applies a CSS class to the <body> and updates display selectors based on the specified theme ID.
 * @param {string} themeId - Theme ID to apply
 */
export function applyThemeById(themeId) {
  const themeToApply = discoveredThemes.find((t) => t.id === themeId);
  let actualThemeIdApplied = themeId;
  let classApplied = false;

  // Remove all theme class
  discoveredThemes.forEach((t) => {
    if (t.className) {
      document.body.classList.remove(t.className);
    }
  });

  if (themeToApply && themeToApply.className) {
    document.body.classList.add(themeToApply.className);
    classApplied = true;
  } else {
    console.warn(
      `Theme ID "${themeId}" not found or its CSS class is missing. Attempting to apply default theme "${DEFAULT_THEME}".`
    );
    const defaultThemeObj = discoveredThemes.find(
      (t) => t.id === DEFAULT_THEME
    );
    if (defaultThemeObj && defaultThemeObj.className) {
      document.body.classList.add(defaultThemeObj.className);
      actualThemeIdApplied = DEFAULT_THEME;
      classApplied = true;
    } else {
      console.error(
        "Default theme or its CSS class not found. Cannot apply any theme class."
      );
    }
  }

  // Update selectors value
  const themeSelectorElement = document.getElementById(THEME_SELECTOR_ID);
  if (themeSelectorElement) {
    const themeExistsInSelector = discoveredThemes.some(
      (theme) => theme.id === actualThemeIdApplied
    );
    if (themeExistsInSelector) {
      themeSelectorElement.value = actualThemeIdApplied;
    } else if (discoveredThemes.length > 0) {
      const defaultThemeInSelector = discoveredThemes.find(
        (t) => t.id === DEFAULT_THEME
      );
      if (defaultThemeInSelector) {
        themeSelectorElement.value = DEFAULT_THEME;
      }
    }
  }
}

/**
 * Initializes the theme manager. It is responsible for discovering themes and building selectors.
 * This function is intended to be called from main.js.
 */
export function initializeThemeSystem() {
  discoverAvailableThemes();
  const themeSelectorElement = document.getElementById(THEME_SELECTOR_ID);

  if (themeSelectorElement) {
    populateThemeSelector(themeSelectorElement);
    // Event listeners are configured in eventHandlers.js
  } else {
    console.log(
      `Theme selector element (#${THEME_SELECTOR_ID}) not found on this page. Theme selection UI will not be available.`
    );
  }
}
