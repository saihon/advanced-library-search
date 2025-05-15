import { dom } from "./dom.js";
import * as ui from "./ui.js";
import * as settingsService from "./settingsService.js";
import * as bookmarkService from "./bookmarkService.js";
import { escapeHTML } from "./utils.js"; // Import escapeHTML directly

let mainCtrl; // Reference to the main controller from main.js

function handleSearchInput() {
  if (!mainCtrl.isSearchOnEnterOnly()) {
    mainCtrl.handleSearchWithDebounce();
  }
}

function handleSearchEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    mainCtrl.executeSearch(true); // true to update URL
  }
}

function handleSearchModeToggle() {
  const newSearchOnEnterOnly = !mainCtrl.isSearchOnEnterOnly();
  mainCtrl.setSearchOnEnterOnly(newSearchOnEnterOnly);
  settingsService
    .saveSetting("searchOnEnter", newSearchOnEnterOnly)
    .then(() => {
      ui.updateSearchModeToggleUI(
        newSearchOnEnterOnly,
        mainCtrl.getCurrentDebounceTime()
      );
      if (!newSearchOnEnterOnly && dom.searchInput.value.trim()) {
        mainCtrl.handleSearchWithDebounce();
      }
    })
    .catch((e) => console.error("Error saving search mode:", e));
}

function handleOptionsToggle() {
  if (
    dom.inPageOptionsPanel.style.display === "none" ||
    !dom.inPageOptionsPanel.style.display
  ) {
    ui.populateOptionsUI(
      mainCtrl.isSearchOnEnterOnly(),
      mainCtrl.getCurrentDebounceTime()
    );
    ui.showOptionsPanel();
  } else {
    ui.hideOptionsPanel();
  }
}

function handleThemeChange(event) {
  // Assuming event.target is the <select id="themeSelector">
  if (event.target.id === "themeSelector") {
    const selectedTheme = event.target.value;
    mainCtrl.applyTheme(selectedTheme); // Call mainController to apply theme via theme.js
    settingsService
      .saveSetting("theme", selectedTheme)
      .then(() => ui.showOptionsStatus("Theme saved!"))
      .catch((e) => console.error("Error saving theme:", e));
  }
}

function handleSearchOnEnterOptionChange(event) {
  const newSearchOnEnter = event.target.checked;
  mainCtrl.setSearchOnEnterOnly(newSearchOnEnter);
  settingsService
    .saveSetting("searchOnEnter", newSearchOnEnter)
    .then(() => {
      ui.showOptionsStatus("Search on Enter setting saved!");
      ui.toggleDebounceInputStateInOptions(newSearchOnEnter);
      ui.updateSearchModeToggleUI(
        newSearchOnEnter,
        mainCtrl.getCurrentDebounceTime()
      );
      if (!newSearchOnEnter && dom.searchInput.value.trim()) {
        mainCtrl.handleSearchWithDebounce();
      }
    })
    .catch((e) => console.error("Error saving search on enter setting:", e));
}

function handleDebounceTimeChange(event) {
  let value = parseInt(event.target.value, 10);
  if (isNaN(value) || value < 0) value = settingsService.DEFAULT_DEBOUNCE_TIME;
  if (value > 5000) value = 5000; // Max debounce time

  dom.debounceTimeInput.value = value; // Update input field with validated value
  mainCtrl.setCurrentDebounceTime(value);
  settingsService
    .saveSetting("debounceTime", value)
    .then(() => {
      ui.showOptionsStatus("Search debounce time saved!");
      ui.updateSearchModeToggleUI(mainCtrl.isSearchOnEnterOnly(), value);
    })
    .catch((e) => console.error("Error saving debounce time:", e));
}

function handleBatchReplaceToggle() {
  // Check if the modal is currently hidden or not set
  if (
    dom.batchReplaceModal &&
    dom.batchReplaceModal.style.display !== "block"
  ) {
    ui.showBatchReplaceUI(); // Use UI function to show modal
    mainCtrl.previewBookmarkReplace(); // Trigger preview generation
  } else {
    ui.hideBatchReplaceUI(); // Use UI function to hide modal
  }
}

function handleClickToClearFocus(event) {
  const ignoreSelectors = [
    "button",
    ".result-item",
    "#searchModeToggle",
    ".modal",
    ".modal-overlay",
  ];

  const clickedOnIgnoredElement = ignoreSelectors.some((selector) =>
    event.target.closest(selector)
  );

  if (!clickedOnIgnoredElement) {
    // clearFocusedLinkStyle is define in main.js
    if (typeof mainCtrl.clearFocusedLinkStyle === "function") {
      mainCtrl.clearFocusedLinkStyle();
    } else {
      console.warn(
        "mainCtrl.clearFocusedLinkStyle function is not defined. Make sure it is globally available."
      );
    }
  }
}

export function initializeHandlers(controller) {
  mainCtrl = controller;

  // Search input
  dom.searchInput.addEventListener("input", handleSearchInput);
  dom.searchInput.addEventListener("keydown", handleSearchEnter);

  // Search mode toggle
  dom.searchModeToggle.addEventListener("click", handleSearchModeToggle);

  document.addEventListener("click", handleClickToClearFocus);

  // Options panel
  if (dom.optionsButton) {
    dom.optionsButton.addEventListener("click", handleOptionsToggle);
  }
  if (dom.closeOptionsPanelButton) {
    dom.closeOptionsPanelButton.addEventListener("click", ui.hideOptionsPanel);
  }
  if (dom.inPageOptionsPanel) {
    dom.inPageOptionsPanel.addEventListener("click", (event) => {
      if (event.target === dom.inPageOptionsPanel) ui.hideOptionsPanel();
    });
  }

  // Options form elements
  if (dom.themeSelector) {
    dom.themeSelector.addEventListener("change", handleThemeChange);
  }
  if (dom.searchOnEnterInput) {
    dom.searchOnEnterInput.addEventListener(
      "change",
      handleSearchOnEnterOptionChange
    );
  }
  if (dom.debounceTimeInput) {
    dom.debounceTimeInput.addEventListener("change", handleDebounceTimeChange);
  }
  // Bookmark edit modal
  if (dom.saveBookmarkButton) {
    // The await inside mainCtrl.handleSaveBookmarkChanges works correctly and asynchronous operations are handled properly.
    dom.saveBookmarkButton.addEventListener(
      "click",
      mainCtrl.handleSaveBookmarkChanges
    );
  }
  if (dom.deleteBookmarkButtonModal) {
    // The await inside mainCtrl.handleDeleteBookmarkFromModal works correctly and asynchronous operations are handled properly.
    dom.deleteBookmarkButtonModal.addEventListener(
      "click",
      mainCtrl.handleDeleteBookmarkFromModal
    );
  }
  if (dom.closeEditModalButton) {
    dom.closeEditModalButton.addEventListener("click", () => {
      ui.hideEditBookmarkModal();
      mainCtrl.clearCurrentEditingItemElement();
    });
  }
  if (dom.editBookmarkModal) {
    dom.editBookmarkModal.addEventListener("click", (event) => {
      if (event.target === dom.editBookmarkModal) {
        ui.hideEditBookmarkModal();
        mainCtrl.clearCurrentEditingItemElement();
      }
    });
  }

  // Bookmark batch replace
  if (dom.toggleReplaceUIButton) {
    dom.toggleReplaceUIButton.addEventListener(
      "click",
      handleBatchReplaceToggle
    );
  }

  // Batch Replace Modal Close Button
  if (dom.closeBatchReplaceModalButton) {
    dom.closeBatchReplaceModalButton.addEventListener(
      "click",
      ui.closeBatchReplaceModal
    );
  }

  // Click outside Batch Replace Modal to close
  if (dom.batchReplaceModal) {
    dom.batchReplaceModal.addEventListener("click", (event) => {
      if (event.target === dom.batchReplaceModal) {
        // Clicked on the overlay
        ui.closeBatchReplaceModal();
      }
    });
  }

  if (dom.replaceFindInput) {
    dom.replaceFindInput.addEventListener(
      "input",
      mainCtrl.previewBookmarkReplace
    );
  }
  if (dom.replaceWithInput) {
    dom.replaceWithInput.addEventListener(
      "input",
      mainCtrl.previewBookmarkReplace
    );
  }
  if (dom.replaceInTitleCheckbox) {
    dom.replaceInTitleCheckbox.addEventListener(
      "change",
      mainCtrl.previewBookmarkReplace
    );
  }
  if (dom.replaceInUrlCheckbox) {
    dom.replaceInUrlCheckbox.addEventListener(
      "change",
      mainCtrl.previewBookmarkReplace
    );
  }
  if (dom.applyAllReplaceButton) {
    dom.applyAllReplaceButton.addEventListener(
      "click",
      mainCtrl.applyAllBookmarkChanges
    );
  }

  // Global keydown for shortcuts and navigation
  document.addEventListener("keydown", mainCtrl.handleShortcutKeys, true); // Capture phase

  // Storage changes listener
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.theme && changes.theme.newValue) {
        mainCtrl.applyTheme(changes.theme.newValue);
        // Display selector is updated in theme.js
      }
      if (changes.debounceTime) {
        const newTime = parseInt(changes.debounceTime.newValue, 10);
        if (!isNaN(newTime) && newTime >= 0) {
          mainCtrl.setCurrentDebounceTime(newTime);
        }
      }
      if (changes.searchOnEnter) {
        mainCtrl.setSearchOnEnterOnly(changes.searchOnEnter.newValue);
      }
      // Update UI elements if options panel is open or main toggle needs update
      ui.updateSearchModeToggleUI(
        mainCtrl.isSearchOnEnterOnly(),
        mainCtrl.getCurrentDebounceTime()
      );
      if (
        dom.inPageOptionsPanel &&
        dom.inPageOptionsPanel.style.display === "block"
      ) {
        ui.populateOptionsUI(
          mainCtrl.isSearchOnEnterOnly(),
          mainCtrl.getCurrentDebounceTime()
        );
      }
    }
  });

  // Handle clicks on dynamically generated "Apply This Change" buttons for batch replace
  if (dom.replacePreviewArea) {
    dom.replacePreviewArea.addEventListener("click", async (event) => {
      if (event.target.classList.contains("apply-single-replace-button")) {
        event.preventDefault();
        const previewItemElement = event.target.closest(".preview-item");
        if (!previewItemElement) return;

        const bookmarkId = previewItemElement.dataset.bookmarkId;
        const newTitle = previewItemElement.dataset.newTitle;
        const newUrl = previewItemElement.dataset.newUrl;

        if (!bookmarkId || newTitle === undefined || newUrl === undefined) {
          console.error(
            "Missing data for single replace:",
            previewItemElement.dataset
          );
          previewItemElement.innerHTML += `<p><strong class="preview-change-error">Error: Missing data.</strong></p>`;
          return;
        }

        // Disable button to prevent multiple clicks
        event.target.disabled = true;
        event.target.textContent = "Applying...";

        try {
          const result = await bookmarkService.applySingleBookmarkChange(
            bookmarkId,
            newTitle,
            newUrl
          );
          if (result.success) {
            const originalItemElement = document.querySelector(
              `.result-item[data-id="${bookmarkId}"]`
            );
            if (originalItemElement) {
              ui.updateBookmarkItemUI(originalItemElement, newTitle, newUrl);
            }
            mainCtrl.updateCurrentResultItem(bookmarkId, newTitle, newUrl);

            previewItemElement.innerHTML = `
                          <p><strong>Applied:</strong> ${escapeHTML(
                            newTitle
                          )} (${escapeHTML(newUrl)})</p>
                          <p><strong class="preview-change-success">Updated successfully!</strong></p>
                      `;
            // Update the corresponding item in the mainController's preview data
            mainCtrl.markPreviewItemApplied(bookmarkId, true);
          } else {
            previewItemElement.innerHTML += `<p><strong class="preview-change-error">Error: ${escapeHTML(
              result.error
            )}</strong></p>`;
            event.target.disabled = false; // Re-enable button on error
            event.target.textContent = "Apply This Change";
            mainCtrl.markPreviewItemApplied(bookmarkId, false, result.error);
          }
        } catch (e) {
          console.error("Error applying single bookmark change:", e);
          previewItemElement.innerHTML += `<p><strong class="preview-change-error">Error: ${escapeHTML(
            e.message
          )}</strong></p>`;
          event.target.disabled = false;
          event.target.textContent = "Apply This Change";
        }
      }
    });
  }

  // Initial population of options if panel is visible by default (though unlikely)
  if (
    dom.inPageOptionsPanel &&
    dom.inPageOptionsPanel.style.display === "block"
  ) {
    ui.populateOptionsUI(
      mainCtrl.isSearchOnEnterOnly(),
      mainCtrl.getCurrentDebounceTime()
    );
  }
}
