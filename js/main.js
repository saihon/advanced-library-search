import { dom } from "./dom.js";
import { parseQuery } from "./parser.js";
import * as settingsService from "./settingsService.js";
import * as ui from "./ui.js"; // Assuming ui.js is created
import * as eventHandlers from "./eventHandlers.js"; // Assuming eventHandlers.js is created
import * as bookmarkService from "./bookmarkService.js";
import * as historyService from "./historyService.js"; // Assuming historyService.js is created
import * as themeManager from "./theme.js";
// utils.js will be imported by modules that need it (e.g., ui.js)
import { escapeHTML } from "./utils.js"; // Import escapeHTML

// --- Global State Variables ---
let currentResults = [];
let currentSearchType = null; // 'bookmarks' or 'history'
let debounceTimeoutId = null;
let currentDebounceTime; // Will be loaded from settingsService
let searchOnEnterOnly; // Will be loaded from settingsService
let currentEditingItemElement = null; // DOM element during bookmark editing
let focusedResultLink = null;
let currentBatchPreviewItems = []; // Stores {id, titlePreview, urlPreview, applied, error}

// --- Utility functions (For clearing focus) ---
function clearFocusedLinkStyle() {
  // Remove the class from the element currently pointed to by focusedResultLink
  if (
    focusedResultLink &&
    focusedResultLink.classList.contains("focused-link")
  ) {
    focusedResultLink.classList.remove("focused-link");
  }
  // Next, clear other .focused-link in the document just in case (to avoid multiple existing)
  const allFocused = dom.resultsContainer.querySelectorAll(
    ".item-header a.title.focused-link"
  );
  allFocused.forEach((link) => link.classList.remove("focused-link"));
  focusedResultLink = null;
}

function previewBookmarkReplace() {
  // No longer needs to be async if service is sync
  const findText = dom.replaceFindInput.value;
  const replaceText = dom.replaceWithInput.value;
  const inTitle = dom.replaceInTitleCheckbox.checked;
  const inUrl = dom.replaceInUrlCheckbox.checked;

  currentBatchPreviewItems = []; // Reset previous preview
  dom.replacePreviewArea.innerHTML = "";

  // If findText is null or undefined, stop processing
  if (findText === null || findText === undefined) {
    alert("Please enter text to find.");
    dom.replacePreviewArea.textContent =
      "Please enter text to find in the input field above.";
    if (dom.applyAllReplaceButton)
      dom.applyAllReplaceButton.style.display = "none";
    return;
  }

  if (!currentResults || currentResults.length === 0) {
    dom.replacePreviewArea.textContent =
      "No bookmarks to preview. Please perform a search first.";
    if (dom.applyAllReplaceButton)
      dom.applyAllReplaceButton.style.display = "none";
    return;
  }

  const bookmarksToPreview = currentResults.filter(
    (r) => r.type === "bookmark"
  );
  if (bookmarksToPreview.length === 0) {
    dom.replacePreviewArea.textContent =
      "No bookmarks in current results to preview.";
    if (dom.applyAllReplaceButton)
      dom.applyAllReplaceButton.style.display = "none";
    return;
  }

  const { previewItems, changesMade } =
    bookmarkService.generateBookmarkReplacePreview(
      bookmarksToPreview,
      findText,
      replaceText,
      inTitle,
      inUrl
    );

  currentBatchPreviewItems = previewItems; // Store for applyAll and single apply

  if (changesMade > 0) {
    currentBatchPreviewItems.forEach((item) => {
      // item is from bookmarkService, includes {id, titlePreview, urlPreview, applied, error}
      // titlePreview/urlPreview include {original, new, rawNew, changed}
      if (item.titlePreview.changed || item.urlPreview.changed) {
        const previewDiv = document.createElement("div");
        previewDiv.className = "preview-item";
        previewDiv.dataset.bookmarkId = item.id;
        // Store raw new values for single apply handler in eventHandlers.js
        previewDiv.dataset.newTitle = item.titlePreview.rawNew;
        previewDiv.dataset.newUrl = item.urlPreview.rawNew;

        let content = `
                    <p><span class="preview-label"> </span><span class="preview-content">${item.titlePreview.original} (${item.urlPreview.original})</span></p>
                    <p><span class="preview-label"> </span><span class="preview-content">${item.titlePreview.new} (${item.urlPreview.new})</span></p>
                `;

        const applySingleButton = document.createElement("button");
        applySingleButton.className = "apply-single-replace-button"; // Ensure class for eventHandlers.js
        applySingleButton.textContent = "Apply This Change";
        // applySingleButton.dataset.bookmarkId = item.id; // Not strictly necessary as parent has it

        previewDiv.innerHTML = content;
        previewDiv.appendChild(applySingleButton);
        dom.replacePreviewArea.appendChild(previewDiv);
      }
    });
  }

  if (dom.applyAllReplaceButton) {
    dom.applyAllReplaceButton.style.display =
      changesMade > 0 ? "inline-block" : "none";
  }

  // --- Display message if no changes were made ---
  if (!changesMade) {
    let noChangeMessage;
    if (bookmarksToPreview.length === 0) {
      // This case is handled earlier, but as a safeguard
      noChangeMessage = "No bookmarks in current results to preview.";
    } else if (findText === "") {
      // If find is empty and replaceWith has content -> tried to replace all but it was the same as original, or no items were present
      noChangeMessage =
        "No changes to preview. Titles/URLs may already match the 'Replace with' text.";
    } else {
      // If find has input but didn't match, or if replacement results in the same content
      noChangeMessage = `No changes to preview. The text "${escapeHTML(
        findText
      )}" was not found in any displayed bookmarks, or the replacement results in the same content.`;
    }
    dom.replacePreviewArea.textContent = noChangeMessage;
  }
}

async function applyAllBookmarkChanges() {
  const itemsToApply = currentBatchPreviewItems.filter(
    (item) =>
      !item.applied && (item.titlePreview.changed || item.urlPreview.changed)
  );

  if (itemsToApply.length === 0) {
    alert(
      "No pending changes to apply. Changes might have already been applied individually, or there were no changes to preview initially."
    );
    if (dom.applyAllReplaceButton)
      dom.applyAllReplaceButton.style.display = "none";
    return;
  }

  // Disable or hide the button during processing (optional)
  dom.applyAllReplaceButton.disabled = true;
  dom.applyAllReplaceButton.textContent = "Applying...";

  const {
    successCount,
    errorCount,
    updatedPreviewItems: processedItems,
  } = await bookmarkService.applyAllBookmarkChanges(itemsToApply);

  // Update currentBatchPreviewItems with the results from the service
  currentBatchPreviewItems = currentBatchPreviewItems.map((batchItem) => {
    const processedVersion = processedItems.find(
      (pItem) => pItem.id === batchItem.id
    );
    return processedVersion ? processedVersion : batchItem;
  });

  // Update UI based on the (potentially updated) currentBatchPreviewItems
  // We iterate over processedItems as these are the ones that were attempted
  processedItems.forEach((item) => {
    const previewDiv = dom.replacePreviewArea.querySelector(
      `.preview-item[data-bookmark-id="${item.id}"]`
    );
    if (!previewDiv) return;

    if (item.applied && !item.error) {
      // Update the main search result item in the main list
      const originalItemElement = document.querySelector(
        `.result-item[data-id="${item.id}"]`
      );
      if (originalItemElement) {
        ui.updateBookmarkItemUI(
          originalItemElement,
          item.titlePreview.rawNew,
          item.urlPreview.rawNew
        );
      }
      // Update currentResults array
      mainController.updateCurrentResultItem(
        item.id,
        item.titlePreview.rawNew,
        item.urlPreview.rawNew
      );
      // Update the preview item's display
      previewDiv.innerHTML = `<p><strong>Applied:</strong> ${escapeHTML(
        item.titlePreview.rawNew // Display raw new title
      )} (${escapeHTML(
        item.urlPreview.rawNew // Display raw new URL
      )}</strong></p>`;
    } else if (item.error) {
      // Append error message to the existing preview content
      const errorP = document.createElement("p");
      errorP.innerHTML = `<strong class="preview-change-error">Error: ${escapeHTML(
        item.error
      )}</strong>`;
      previewDiv.appendChild(errorP);

      // Re-enable the single apply button if it exists
      const buttonInPreview = previewDiv.querySelector(
        "button.apply-single-replace-button"
      );
      if (buttonInPreview) {
        buttonInPreview.disabled = false;
        buttonInPreview.textContent = "Apply This Change";
      }
    }
  });

  // After processing, restore the button state or hide it
  dom.applyAllReplaceButton.disabled = false;
  dom.applyAllReplaceButton.textContent = "Apply All Visible Changes"; // 元のテキストに戻す

  alert(
    `Batch replace finished.\nSuccessfully applied: ${successCount}\nFailed to apply: ${errorCount}`
  );

  if (errorCount > 0) {
    // If there were errors, items that haven't been applied or failed might still be in the preview,
    // so either re-display the "Apply All" button or prompt the user for manual confirmation.
    const remainingPendingItems = Array.from(
      dom.replacePreviewArea.querySelectorAll(".preview-item") // Re-query for items that might still have a button
    ).filter((itemEl) =>
      itemEl.querySelector("button.apply-single-replace-button:not(:disabled)")
    );
    if (remainingPendingItems.length === 0) {
      if (dom.applyAllReplaceButton)
        dom.applyAllReplaceButton.style.display = "none";
      if (successCount > 0 && errorCount === 0) {
        // Clear preview area only if all were successful
        dom.replacePreviewArea.innerHTML = `<p><strong class="preview-change-success">All ${successCount} changes applied successfully!</strong></p>`;
        setTimeout(() => {
          if (
            dom.replacePreviewArea.firstChild &&
            dom.replacePreviewArea.firstChild.textContent.includes("All")
          ) {
            // Check if the message is still there
            dom.replacePreviewArea.innerHTML = "";
          }
        }, 3000);
      }
    }
  } else if (successCount > 0) {
    // If no errors and at least one success
    if (dom.applyAllReplaceButton)
      // Hide the button as all were applied
      dom.applyAllReplaceButton.style.display = "none";
    dom.replacePreviewArea.innerHTML = `<p><strong class="preview-change-success">All ${successCount} changes applied successfully!</strong></p>`;
    setTimeout(() => {
      if (
        dom.replacePreviewArea.firstChild &&
        dom.replacePreviewArea.firstChild.textContent.includes("All")
      ) {
        dom.replacePreviewArea.innerHTML = "";
      }
    }, 3000);
  }
  // If both successCount and errorCount are 0, it should have been handled by the initial "No pending changes".
}

// --- Main search process and URL parameter handling ---
function handleSearchWithDebounce() {
  clearTimeout(debounceTimeoutId);
  debounceTimeoutId = setTimeout(() => {
    executeSearch(true); // true for updateUrl
  }, currentDebounceTime);
}

function resetUIBeforeSearch() {
  dom.resultsContainer.innerHTML = "";
  // Hide the toggle button container and the batch replace UI container
  if (dom.batchReplaceToggleButtonContainer) {
    dom.batchReplaceToggleButtonContainer.style.display = "none";
    ui.hideBatchReplaceUI(); // Ensure modal is hidden
    if (dom.replacePreviewArea) dom.replacePreviewArea.innerHTML = "";
    if (dom.applyAllReplaceButton)
      dom.applyAllReplaceButton.style.display = "none";
  }
  const existingClearButtonContainer = document.getElementById(
    "clearAllHistoryButtonContainer"
  );
  if (existingClearButtonContainer) {
    // Hide it
    existingClearButtonContainer.style.display = "none";
  }
}

async function executeSearch(updateUrl = false, initialQueryFromUrl = null) {
  const queryToParse =
    initialQueryFromUrl !== null ? initialQueryFromUrl : dom.searchInput.value;

  resetUIBeforeSearch();

  currentResults = []; // Reset global results array
  currentSearchType = null; // Reset global search type

  // --- Parse query ---
  let results = {};
  try {
    results = parseQuery(queryToParse.trim());
  } catch (e) {
    ui.displayErrorMessage(`parseQuery error: ${e.message}`); // Call ui.js function
    return;
  }
  const { command, searchTerm, options } = results;

  // --- Display help ---
  if (options.help) {
    ui.displayHelp(); // Call ui.js function
    return;
  }

  // --- Checking if search criteria exist ---
  const hasSearchCriteria =
    searchTerm ||
    options.titleSearchTerm ||
    options.urlSearchTerm ||
    options.date ||
    (command === "b" && options.folder);

  if (!hasSearchCriteria) {
    if (updateUrl && initialQueryFromUrl === null) clearUrlParams();
    return;
  }

  // --- URL Parameter Update ---
  if (updateUrl && initialQueryFromUrl === null) {
    updateUrlParams(command, dom.searchInput.value.trim());
  }

  // --- Search execution ---
  try {
    // Display loading message after all preliminary checks and before async search starts
    ui.displayLoadingMessage();

    if (!command || command === "b") {
      currentSearchType = "bookmarks";

      currentResults = await bookmarkService.searchBookmarks(
        searchTerm,
        options
      );

      // Clear loading message before appending results if results will be appended one by one
      ui.clearLoadingMessage();

      currentResults.forEach((item) => {
        ui.displayResult(item, mainController.getDisplayResultCallbacks());
      });

      if (currentResults.length > 0) {
        if (dom.batchReplaceToggleButtonContainer) {
          // Display batch replace toggle button
          dom.batchReplaceToggleButtonContainer.style.display = "block";
        }
      }
    } else if (command === "h") {
      currentSearchType = "history";

      // Call historyService.searchHistory
      currentResults = await historyService.searchHistory(searchTerm, options);

      // Clear loading message before appending results
      ui.clearLoadingMessage();

      currentResults.forEach((item) =>
        ui.displayResult(item, mainController.getDisplayResultCallbacks())
      );

      if (currentResults.length > 0) {
        ui.displayClearAllHistoryButton(
          currentResults.length,
          mainController.handleDeleteAllDisplayedHistory
        );
      }
    }

    // Display message if no results (only if no error message is present)
    if (
      currentResults.length === 0 &&
      !dom.resultsContainer.querySelector(".error-message")
    ) {
      // Call ui.js function
      ui.displayNoResultsMessage();
    }
  } catch (e) {
    console.error("Error during search execution:", e);
    ui.displayErrorMessage("An unexpected error occurred during search."); // Call ui.js function
    if (updateUrl && initialQueryFromUrl === null) clearUrlParams();
  }
}

function updateUrlParams(command, searchInputFullValue) {
  // command: 'b', 'h', or null (result from parseQuery)
  // searchInputFullValue: The complete string entered by the user, passed from searchInput.value.trim()

  const params = new URLSearchParams();
  let typeForUrlParam;
  let queryForUrlParam = "";

  // 1. Set 'type' parameter
  if (command === "h") {
    typeForUrlParam = "h";
  } else {
    // 'b' or no command (defaults to bookmarks)
    typeForUrlParam = "b";
  }
  params.set("t", typeForUrlParam);

  // 2. Set 'query' parameter (the part without the prefix)
  // Use parseQuery to separate the command and the actual query part from the current input
  // However, parseQuery returns searchTerm including options, etc., so what's needed here is "everything remaining after the prefix"
  if (searchInputFullValue) {
    if (
      command === "b" &&
      searchInputFullValue.toLowerCase().startsWith("b:")
    ) {
      queryForUrlParam = searchInputFullValue.substring(2).trim();
    } else if (
      command === "h" &&
      searchInputFullValue.toLowerCase().startsWith("h:")
    ) {
      queryForUrlParam = searchInputFullValue.substring(2).trim();
    } else if (!command) {
      // If there was no command prefix
      queryForUrlParam = searchInputFullValue;
    } else {
      // Rare case where command is 'b'/'h' but searchInputFullValue has no prefix
      // (e.g., after loading from URL parameters, the user deleted only the prefix)
      // In this case, treat queryForUrlParam as searchInputFullValue itself
      queryForUrlParam = searchInputFullValue;
    }
  }

  if (queryForUrlParam) {
    // Set if the query after prefix removal is not empty
    params.set("q", queryForUrlParam);
  } else if (command && !queryForUrlParam) {
    // If type exists but query is empty (e.g., searching with just "b:")
    // Can choose to set an empty query or not. Not setting it here.
  }

  const queryString = params.toString();
  const baseUrl = browser.runtime.getURL("index.html");
  const newUrl = baseUrl + (queryString ? `?${queryString}` : "");

  if (window.location.href !== newUrl) {
    history.pushState(
      { query: searchInputFullValue, type: typeForUrlParam },
      "",
      newUrl
    );
  }
}

function clearUrlParams() {
  const newUrl = browser.runtime.getURL("index.html");
  // Compare the path and query parameter part of the current URL
  const currentPathAndQuery = window.location.pathname + window.location.search;
  const extensionBaseUrl = browser.runtime.getURL(""); // moz-extension://UUID/
  const indexPathOnly = newUrl.substring(extensionBaseUrl.length - 1); // /index.html (keep the leading /)

  if (
    currentPathAndQuery !== indexPathOnly &&
    currentPathAndQuery !== indexPathOnly + "?"
  ) {
    // Clear only if parameters exist
    history.pushState(null, "", newUrl);
  }
}

// --- Shortcut key handling functions ---
function handleShortcutKeys(event) {
  // const activeElement = document.activeElement;
  // if (
  //   activeElement === dom.searchInput &&
  //   event.key !== "F2"
  // ) {
  //   console.log(1);
  //   return;
  // }

  if (
    (dom.inPageOptionsPanel &&
      dom.inPageOptionsPanel.style.display === "block") ||
    (dom.editBookmarkModal &&
      dom.editBookmarkModal.style.display === "block") ||
    (dom.bookmarkReplaceContainer &&
      dom.bookmarkReplaceContainer.style.display === "block")
  ) {
    // If a modal window (options, edit, batch replace) is visible, do nothing.
    return;
  }

  let handled = false;

  switch (event.key) {
    case "F2":
      clearFocusedLinkStyle(); // Clear focus style before focusing on the search box with F2
      dom.searchInput.focus();
      dom.searchInput.select(); // Select the text
      window.scrollTo(0, 0);
      handled = true;
      break;
    default:
      if (event.ctrlKey) {
        switch (event.key) {
          case "j":
            navigateResults(1); // 1 for next
            handled = true;
            break;
          case "k":
            navigateResults(-1); // -1 for previous
            handled = true;
            break;
        }
      }
      break;
  }

  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function navigateResults(direction) {
  // direction: 1 for next, -1 for previous
  const resultItems = Array.from(
    dom.resultsContainer.querySelectorAll(".result-item")
  );
  const links = resultItems
    .map((item) => item.querySelector(".item-header a.title"))
    .filter(Boolean);

  if (links.length === 0) {
    clearFocusedLinkStyle();
    return;
  }

  let currentIndex = -1;
  if (focusedResultLink && links.includes(focusedResultLink)) {
    currentIndex = links.indexOf(focusedResultLink);
  } else if (document.activeElement && links.includes(document.activeElement)) {
    // If for some reason focusedResultLink is null, but a result link actually has focus
    currentIndex = links.indexOf(document.activeElement);
  }

  let nextIndex;
  if (currentIndex === -1 && document.activeElement === dom.searchInput) {
    // If no item is currently focused and search input has focus
    nextIndex = direction === 1 ? 0 : links.length - 1; // Next goes to first, previous to last
  } else if (currentIndex === -1) {
    nextIndex = direction === 1 ? 0 : links.length - 1;
  } else {
    nextIndex = currentIndex + direction;
  }

  // Index range check and behavior at the ends
  if (nextIndex >= links.length) {
    nextIndex = links.length - 1; // If at the bottom and pressed down, stay at the bottom
  } else if (nextIndex < 0) {
    nextIndex = 0; // If at the top and pressed up, stay at the top
  }

  if (links[nextIndex]) {
    clearFocusedLinkStyle();

    focusedResultLink = links[nextIndex]; // Remember the new focus target
    focusedResultLink.focus(); // Focus the link element

    // Apply style to the focused element (optional)
    focusedResultLink.classList.add("focused-link");

    // Scroll so the element is within the viewport
    focusedResultLink.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

async function loadStateFromUrlAndSearch() {
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get("t"); // urlParams.get("type"); 'bookmark' or 'history'
  const queryParam = urlParams.get("q"); // Search term or options without prefix

  let initialFullQueryForSearch = null;

  if (typeParam && queryParam !== null) {
    // If both type and query are present
    let prefix = "";
    if (typeParam === "b" || typeParam === "bookmark") {
      prefix = "b: ";
    } else if (typeParam === "h" || typeParam === "history") {
      prefix = "h: ";
    }

    if (prefix) {
      initialFullQueryForSearch = prefix + queryParam;
      dom.searchInput.value = initialFullQueryForSearch;
    } else {
      // If unknown typeParam, use queryParam as is or treat as an error
      initialFullQueryForSearch = queryParam; // Treat as no prefix
      dom.searchInput.value = initialFullQueryForSearch;
      console.warn(
        `Unknown type parameter: ${typeParam}. Searching without prefix.`
      );
    }
  } else if (queryParam !== null) {
    // Only query (no type) -> default to bookmark search
    initialFullQueryForSearch = queryParam; // Treat as input without prefix
    dom.searchInput.value = initialFullQueryForSearch;
    // In this case, command will be null in executeSearch, defaulting to bookmark search
  }
  // If only type is present and query is not, the search box remains empty and search is not executed

  if (initialFullQueryForSearch !== null) {
    clearTimeout(debounceTimeoutId);
    // Pass the complete search string (prefix + queryParam) to executeSearch
    await executeSearch(false, initialFullQueryForSearch); // false: do not update URL, pass search string as second arg
  }
}

// --- Initialization process ---
async function initialize() {
  const loadedSettings = await settingsService.loadSettings();
  currentDebounceTime = loadedSettings.debounceTime;
  searchOnEnterOnly = loadedSettings.searchOnEnter;

  themeManager.initializeThemeSystem(); // Initialize theme system (discovers themes, populates selector)
  themeManager.applyThemeById(loadedSettings.theme); // Apply the loaded theme

  ui.updateSearchModeToggleUI(searchOnEnterOnly, currentDebounceTime);

  // eventHandlers.initializeHandlers will set up event listeners.
  eventHandlers.initializeHandlers(mainController); // Pass mainController for callbacks

  await loadStateFromUrlAndSearch();
  dom.searchInput.focus();
}

// Define mainController to be passed to eventHandlers and used for callbacks
const mainController = {
  // --- State Accessors & Mutators ---
  getCurrentDebounceTime: () => currentDebounceTime,
  isSearchOnEnterOnly: () => searchOnEnterOnly,
  setCurrentDebounceTime: (time) => {
    currentDebounceTime = time;
  },
  setSearchOnEnterOnly: (val) => {
    searchOnEnterOnly = val;
  },
  getCurrentEditingItemElement: () => currentEditingItemElement,
  clearCurrentEditingItemElement: () => {
    currentEditingItemElement = null;
  },
  getCurrentBatchPreviewItems: () => currentBatchPreviewItems,

  // --- Core Search & UI Actions ---
  executeSearch, // Core search execution logic, exposed for direct calls if needed
  handleSearchWithDebounce, // Debounced search trigger
  applyTheme: (themeId) => {
    // Apply theme via themeManager
    themeManager.applyThemeById(themeId);
  },
  clearFocusedLinkStyle, // Utility for UI focus management

  // --- Event Handler Callbacks & Triggers ---
  // (These are often called directly from eventHandlers.js or are core UI interactions)
  handleShortcutKeys, // Handles global keyboard shortcuts

  // --- CRUD-like Operations & Result/Preview Management ---
  //    Bookmark Editing & Deletion
  handleEditBookmarkRequest: (bookmarkData, itemElement) => {
    currentEditingItemElement = itemElement;
    ui.showEditBookmarkModal(bookmarkData);
  },
  handleSaveBookmarkChanges: async () => {
    const bookmarkId = dom.editBookmarkIdInput.value;
    const newTitle = dom.editBookmarkTitleInput.value.trim();
    const newUrl = dom.editBookmarkUrlInput.value.trim();
    if (!newUrl) {
      alert("URL cannot be empty.");
      return;
    }
    try {
      await bookmarkService.saveBookmark(bookmarkId, newTitle, newUrl);
      if (currentEditingItemElement) {
        ui.updateBookmarkItemUI(currentEditingItemElement, newTitle, newUrl);
      }
      mainController.updateCurrentResultItem(bookmarkId, newTitle, newUrl);
      ui.hideEditBookmarkModal();
    } catch (e) {
      console.error("Error saving bookmark changes from modal:", e);
      alert(`Error saving bookmark: ${e.message}`);
    } finally {
      mainController.clearCurrentEditingItemElement();
    }
  },
  handleDeleteBookmarkFromModal: async () => {
    const bookmarkId = dom.editBookmarkIdInput.value;
    if (!bookmarkId) return;
    // const bookmarkTitle = dom.editBookmarkTitleInput.value || "this bookmark"; // Get title for confirmation
    // if (
    //   !ui.confirmAction(
    //     // Reverted to ui.confirmAction
    //     `Are you sure you want to delete the bookmark "${escapeHTML(
    //       bookmarkTitle
    //     )}"? This cannot be undone.`
    //   )
    // ) {
    //   return;
    // }
    try {
      await bookmarkService.deleteBookmark(bookmarkId);
      currentEditingItemElement?.remove();
      mainController.removeCurrentResultItem(bookmarkId);
      ui.hideEditBookmarkModal();
    } catch (e) {
      console.error("Error deleting bookmark from modal:", e);
      alert(`Error deleting bookmark: ${e.message}`);
    } finally {
      mainController.clearCurrentEditingItemElement();
    }
  },
  //    History Deletion
  handleDeleteHistoryRequest: async (url, itemElement) => {
    // This is called by getDisplayResultCallbacks, but defined here for clarity
    // if (
    //   !ui.confirmAction(
    //     `Delete "${escapeHTML(url)}" from history? This cannot be undone.`
    //   ) // Reverted to confirm
    // ) {
    //   return;
    // }
    await historyService.deleteHistoryItem(url);
    itemElement.remove();
    currentResults = currentResults.filter(
      (r) => !(r.type === "history" && r.data.url === url)
    );
  },
  handleDeleteAllDisplayedHistory: async function () {
    if (currentResults.length === 0 || currentSearchType !== "history") return;
    if (
      ui.confirmAction(
        // Reverted to ui.confirmAction
        `Delete all ${currentResults.length} displayed history items?
This may take some time if you have a lot of browsing history to delete.`
      )
    ) {
      const urlsToDelete = currentResults
        .filter((r) => r.type === "history")
        .map((r) => r.data.url);

      dom.clearAllHistoryButton.disabled = true;
      dom.clearAllHistoryButton.textContent = "Deleting...";

      const { successCount, errorCount } =
        await historyService.deleteAllHistoryItems(urlsToDelete);

      dom.clearAllHistoryButton.disabled = false;
      dom.clearAllHistoryButton.textContent =
        "Delete all displayed history items";

      console.log(
        `Deleted ${successCount} history items successfully. Error ${errorCount}`
      );

      executeSearch(false); // Re-run search to reflect changes
    }
  },
  //    Batch Bookmark Replace
  previewBookmarkReplace, // Generates and displays batch replace preview
  applyAllBookmarkChanges, // Applies all changes from the batch preview
  markPreviewItemApplied: (bookmarkId, success, errorMsg = null) => {
    // Updates a single item in currentBatchPreviewItems, called by eventHandlers.js
    const itemIndex = currentBatchPreviewItems.findIndex(
      (item) => item.id === bookmarkId
    );
    if (itemIndex > -1) {
      currentBatchPreviewItems[itemIndex].applied = success;
      currentBatchPreviewItems[itemIndex].error = success ? null : errorMsg;
    } else {
      console.warn(
        `Bookmark ${bookmarkId} not found in currentBatchPreviewItems to mark.`
      );
    }
  },
  //    Internal Result State Management (used after edits/deletes)
  updateCurrentResultItem: (id, newTitle, newUrl) => {
    const resultIdx = currentResults.findIndex(
      (r) => r.type === "bookmark" && r.data.id === id
    );
    if (resultIdx > -1) {
      currentResults[resultIdx].data.title = newTitle;
      currentResults[resultIdx].data.url = newUrl;
    }
  },
  removeCurrentResultItem: (idOrUrl, type = "bookmark") => {
    if (type === "bookmark") {
      currentResults = currentResults.filter(
        (r) => !(r.type === "bookmark" && r.data.id === idOrUrl)
      );
    } else if (type === "history") {
      // Though history deletion is handled differently in its callback
      currentResults = currentResults.filter(
        (r) => !(r.type === "history" && r.data.url === idOrUrl)
      );
    }
  },
  // --- Callback Providers for Other Modules ---
  getDisplayResultCallbacks: () => ({
    onEditBookmark: (bookmarkData, itemElement) => {
      currentEditingItemElement = itemElement;
      ui.showEditBookmarkModal(bookmarkData);
    },
    onDeleteHistory: async (url, itemElement, title) => {
      // if (
      //   !ui.confirmAction(
      //     // Reverted to ui.confirmAction
      //     `Delete "${escapeHTML(
      //       title || url
      //     )}" from history? This cannot be undone.`
      //   )
      // ) {
      //   return;
      // }
      try {
        await historyService.deleteHistoryItem(url);
        itemElement.remove();
        currentResults = currentResults.filter(
          (r) => !(r.type === "history" && r.data.url === url)
        );
      } catch (e) {
        console.error("Error deleting history item from callback:", e);
        ui.displayErrorMessage(`Failed to delete history: ${e.message}`);
      }
    },
  }),
};

// --- Initialization execution ---
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
