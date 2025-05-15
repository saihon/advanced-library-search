// Apply theme when a new tab/window for the extension is opened
// This is somewhat redundant if index.js and options.js handle it on load,
// but can be useful for consistency.
browser.runtime.onInstalled.addListener(() => {
  console.log("Advanced Library Search installed/updated.");
  // Default theme is handled by settingsService.js on load in UI pages.
  // This listener can be used for other one-time setup/migration tasks.
});

// Listen for the action button click
browser.action.onClicked.addListener((tab) => {
  openSearchPage();
});

// Listen for commands (shortcuts)
browser.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    // The _execute_action command now triggers browser.action.onClicked
    // if no popup is defined, so the above listener will handle it.
    // If you wanted a different behavior for the shortcut, you'd handle it here.
    // For this case, we want the same behavior (open search page).
    // The browser.action.onClicked listener is sufficient.
    console.log("Action executed by command:", command);
    // openSearchPage(); // No need to call this here if _execute_action triggers onClicked
  }
});

function openSearchPage() {
  const searchPageUrl = browser.runtime.getURL("index.html");

  // Check if a tab with this URL already exists
  browser.tabs
    .query({ url: searchPageUrl })
    .then((tabs) => {
      if (tabs.length > 0) {
        // If it exists, focus it
        browser.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
          browser.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        // If not, create a new tab
        browser.tabs.create({ url: searchPageUrl });
      }
    })
    .catch((error) => {
      console.error("Error opening or focusing search page:", error);
      // Fallback to just opening a new tab if query fails for some reason
      browser.tabs.create({ url: searchPageUrl });
    });
}
