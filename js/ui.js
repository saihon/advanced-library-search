import { dom } from "./dom.js";
import { escapeHTML, getDefaultFavicon, getFaviconUrl } from "./utils.js";

export function updateSearchModeToggleUI(
  searchOnEnterOnly,
  currentDebounceTime
) {
  if (searchOnEnterOnly) {
    dom.searchModeToggle.classList.add("active");
    dom.searchModeToggle.textContent = "↵"; // Enter symbol
    dom.searchModeToggle.title =
      "Mode: Search on Enter key. Click to switch to search-on-type.";
  } else {
    dom.searchModeToggle.classList.remove("active");
    dom.searchModeToggle.textContent = "Aa";
    dom.searchModeToggle.title = `Mode: Search as you type (debounce ${currentDebounceTime}ms). Click to switch to Enter-key search.`;
  }
}

// Displays a loading message in the results container.
export function displayLoadingMessage() {
  if (dom.resultsContainer) {
    dom.resultsContainer.innerHTML =
      '<p class="loading-message">Searching...</p>';
  }
}

export function clearLoadingMessage() {
  if (dom.resultsContainer.querySelector(".loading-message")) {
    dom.resultsContainer.innerHTML = ""; // Clear loading message
  }
}

export function displayResult(resultItem, callbacks) {
  const item = resultItem.data;
  const div = document.createElement("div");
  div.className = "result-item";
  div.dataset.url = item.url;
  div.dataset.title = item.title || "";
  if (resultItem.type === "bookmark") {
    div.dataset.id = item.id;
  }

  const header = document.createElement("div");
  header.className = "item-header";

  const favicon = document.createElement("img");
  favicon.style.width = "16px";
  favicon.className = "favicon";
  favicon.src = getFaviconUrl(item.url);
  favicon.alt = "";
  favicon.onerror = function () {
    this.onerror = null;
    this.src = getDefaultFavicon();
  };
  header.appendChild(favicon);

  const titleLink = document.createElement("a");
  titleLink.href = item.url;
  titleLink.className = "title";
  titleLink.target = "_blank"; // Open in new tab
  titleLink.rel = "noopener noreferrer";
  titleLink.textContent =
    item.title ||
    (item.url
      ? item.url.substring(0, 70) + (item.url.length > 70 ? "..." : "")
      : "No Title");
  if (!item.title && item.url) {
    titleLink.classList.add("url-as-title");
  }
  header.appendChild(titleLink);

  div.appendChild(header);

  const urlP = document.createElement("p");
  urlP.className = "item-url";
  urlP.textContent = item.url;
  div.appendChild(urlP);

  // --- Item Controls (Meta Info & Actions) ---
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "item-controls";

  const metaInfoSpan = document.createElement("span");
  metaInfoSpan.className = "item-meta-info";

  if (resultItem.type === "bookmark") {
    const date = item.dateAdded
      ? new Date(item.dateAdded).toLocaleDateString()
      : "N/A";
    metaInfoSpan.textContent = `Date: ${date} | Folder: ${
      item.folderPath || "N/A"
    }`;
  } else if (resultItem.type === "history") {
    const date = item.lastVisitTime
      ? new Date(item.lastVisitTime).toLocaleDateString()
      : "N/A";
    metaInfoSpan.textContent = `Date: ${date} | Visits: ${
      item.visitCount || "N/A"
    }`;
  }
  controlsDiv.appendChild(metaInfoSpan);

  const actionsSpan = document.createElement("span");
  actionsSpan.className = "result-actions";

  if (resultItem.type === "bookmark") {
    const editButton = document.createElement("button");
    editButton.className = "action-button edit-bookmark-button";
    editButton.textContent = "Edit";
    editButton.title = "Edit bookmark";
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onEditBookmark(item, div);
    });
    actionsSpan.appendChild(editButton);
  } else if (resultItem.type === "history") {
    const deleteButton = document.createElement("button");
    deleteButton.className = "action-button delete-history-button";
    deleteButton.textContent = "Delete";
    deleteButton.title = "Delete history entry";
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onDeleteHistory(item.url, div, item.title);
    });
    actionsSpan.appendChild(deleteButton);
  }

  if (actionsSpan.hasChildNodes()) {
    controlsDiv.appendChild(actionsSpan);
  }
  div.appendChild(controlsDiv);

  dom.resultsContainer.appendChild(div);
  return div; // Return the created element for potential focus management
}

export function showBatchReplaceUI() {
  if (dom.batchReplaceModal) dom.batchReplaceModal.style.display = "block";
  if (dom.bookmarkReplaceContainer)
    dom.bookmarkReplaceContainer.style.display = "block";
  // Clear previous preview content when showing
  if (dom.replacePreviewArea) dom.replacePreviewArea.innerHTML = "";
  dom.replaceFindInput.focus();
}

export function hideBatchReplaceUI() {
  if (dom.batchReplaceModal) dom.batchReplaceModal.style.display = "none";
  // The toggle button is hidden/shown based on search results in main.js
}

export function displayHelp() {
  dom.resultsContainer.innerHTML = `
    <div class="help-text-in-results">
        <h2>Advanced Library Search - Help</h2>
        <p>Prefix your search query to specify the search target:</p>
        <ul>
            <li><code>b: &lt;search term&gt; [options]</code> - Search bookmarks. (Default if no prefix is used)</li>
            <li><code>h: &lt;search term&gt; [options]</code> - Search history.</li>
        </ul>

        <p><strong>General Options (applies to main search term, title, and URL filters):</strong></p>
        <ul>
            <li><code>-r</code> - Interpret search terms as case-insensitive regular expressions.</li>
        </ul>

        <p><strong>Filtering Options:</strong></p>
        <ul>
            <li><code>-t &lt;string&gt;</code> - Filter by title containing &lt;string&gt;. For multi-word titles, enclose in quotes (e.g., <code>-t "my document"</code>). If <code>-r</code> is used, &lt;string&gt; is treated as a regex.</li>
            <li><code>-u &lt;string&gt;</code> - Filter by URL containing &lt;string&gt;. If <code>-r</code> is used, &lt;string&gt; is treated as a regex.</li>
            <li><code>-f &lt;glob_pattern&gt;</code> - (Bookmarks only) Filter bookmarks where their full folder path matches the provided glob pattern.
                <ul>
                    <li>The glob pattern is matched against the entire folder path (e.g., <code>/Bookmarks Menu/Work/Project A</code>).</li>
                    <li><code>*</code> matches any characters except <code>/</code> (within a single folder name).</li>
                    <li><code>**</code> matches any characters including <code>/</code> (can span multiple directory levels).</li>
                    <li>Example: <code>-f "/Work/**/Reports"</code>, <code>-f "Project Alpha"</code> (matches if "Project Alpha" is any part of the path, e.g., <code>**/Project Alpha</code>), <code>-f "**/Urgent"</code>.</li>
                </ul>
            </li>
            <li><code>-d &lt;date_spec&gt;</code> - (History only) Filter by date. &lt;date_spec&gt; format:
                <ul>
                    <li><code>YYYY-MM-DD</code>: Specific day.</li>
                    <li><code>-YYYY-MM-DD</code>: On or before YYYY-MM-DD (e.g., <code>-2023-06-15</code>).</li>
                    <li><code>YYYY-MM-DD-</code>: On or after YYYY-MM-DD (e.g., <code>2023-01-01-</code>).</li>
                    <li><code>YYYY-MM-DD1-YYYY-MM-DD2</code>: Between YYYY-MM-DD1 and YYYY-MM-DD2 (inclusive, e.g., <code>2023-01-01-2023-03-31</code>).</li>
                </ul>
            </li>
            <li><code>-m &lt;number&gt;</code> - (History only) Set maximum number of results (default: 300).</li>
        </ul>

        <p><strong>Batch Bookmark Replace:</strong></p>
        <p>This feature allows you to find and replace text within the titles and URLs of bookmarks currently displayed in your search results.</p>
        <ul>
            <li><strong>Activation:</strong> After performing a bookmark search, if results are found, a "Show Batch Replace" button appears below the search bar. Click it to expand the Batch Replace panel.</li>
            <li><strong>Find text:</strong> Enter the text you want to find in bookmark titles or URLs. The search is case-insensitive.</li>
            <li><strong>Replace with text:</strong> Enter the text you want to replace the found text with. If left empty, the found text will be effectively deleted.</li>
            <li><strong>Special case:</strong> If 'Find text' is empty and 'Replace with text' has content, the entire original title/URL of matching bookmarks will be replaced by the 'Replace with text' value.</li>
            <li><strong>Preview:</strong> A preview of all proposed changes will be displayed.</li>
            <li><strong>Apply Changes:</strong>
                <ul>
                    <li>Click 'Apply This Change' next to an individual item to apply only that change.</li>
                    <li>Click 'Apply All Visible Changes' to apply all changes shown in the preview.</li>
                </ul>
            </li>
            <li><strong>Caution:</strong> Changes made using Batch Replace directly modify your bookmarks and cannot be undone through this tool.</li>
        </ul>

        <p><strong>Other Options:</strong></p>
        <ul>
            <li><code>-h</code> - Display this help message.</li>
        </ul>

        <p><strong>Examples:</strong></p>
        <ul>
            <li><code>b: recipe -t "italian dish" -f "Recipes/Italian*"</code> (Search bookmarks for "recipe", with "italian dish" in the title, in a folder path where the last segment starts with "Italian" under a "Recipes" folder, e.g., <code>**/Recipes/Italian Food</code>)</li>
            <li><code>b: -f "/Bookmarks Toolbar/Tech/**/AI"</code> (Search bookmarks in any folder named "AI" that is a subfolder (any level deep) of a "Tech" folder directly under the "Bookmarks Toolbar")</li>
            <li><code>b: -f "**/Shopping"</code> (Search bookmarks in any folder named "Shopping", regardless of its location in the folder tree)</li>
            <li><code>h: news -r -d 2023-10-01- -m 50</code> (Search history for "news" (as regex) on or after Oct 1, 2023, limit 50 results)</li>
            <li><code>my search term -u example.com</code> (Search bookmarks (default) for "my search term" with "example.com" in the URL)</li>
        </ul>

        <p><strong>Keyboard Shortcuts:</strong></p>
        <ul>
            <li><code>F2</code>: Focus the search input field and select its content.</li>
            <li><code>&darr;</code> / <code>&uarr;</code> (Arrow Down / Arrow Up): Navigate through search results.</li>
            <li><code>Enter</code>:
                <ul>
                    <li>When search input is focused: Executes the search.</li>
                    <li>When a search result link is focused (e.g., using arrow keys): Opens the link (typically in a new tab).</li>
                </ul>
            </li>
            <li><code>Escape</code>: Standard browser behavior (e.g., may clear input focus). For extension-specific modals (Edit, Options), use their close buttons or click outside.</li>
        </ul>

        <h4>Important Note on Confirmation Dialogs:</h4>
        <p>
          ⚠️ If you check the "Don't allow advanced-library-search to prompt you again" box in the dialog, some features will stop working. If you've already checked it, please disable and then re-enable the extension.
        </p>
    </div>`;
  if (dom.bookmarkReplaceContainer) {
    dom.bookmarkReplaceContainer.style.display = "none";
  }
  hideBatchReplaceUI(); // Ensure modal is hidden when help is shown
  if (dom.clearAllHistoryButtonContainer) {
    dom.clearAllHistoryButtonContainer.style.display = "none";
  }
}

export function displayErrorMessage(message) {
  dom.resultsContainer.innerHTML = `<p class="error-message">${escapeHTML(
    message
  )}</p>`;
  if (dom.bookmarkReplaceContainer) {
    dom.bookmarkReplaceContainer.style.display = "none"; // Keep this as a fallback if modal isn't used
  }
  hideBatchReplaceUI(); // Ensure modal is hidden when error is shown
  if (dom.clearAllHistoryButtonContainer) {
    dom.clearAllHistoryButtonContainer.style.display = "none";
  }
}

export function displayNoResultsMessage() {
  dom.resultsContainer.innerHTML =
    "<p>No items found matching your criteria.</p>";
}

export function displayClearAllHistoryButton(count, onDeleteAllCallback) {
  if (!dom.clearAllHistoryButtonContainer) {
    console.warn("clearAllHistoryButtonContainer not found in DOM.");
    return;
  }
  if (!dom.clearAllHistoryButton) {
    console.warn("clearAllHistoryButton not found in DOM.");
    return;
  }
  if (dom.clearAllHistoryButtonContainer && dom.clearAllHistoryButton) {
    dom.clearAllHistoryButton.textContent = `Delete all ${count} displayed history items`;
    dom.clearAllHistoryButtonContainer.style.display = "block";
    // Remove old listener before adding a new one to prevent multiple executions
    const newButton = dom.clearAllHistoryButton.cloneNode(true);
    dom.clearAllHistoryButton.parentNode.replaceChild(
      newButton,
      dom.clearAllHistoryButton
    );
    // dom.clearAllHistoryButton = newButton; // This line causes the error and is not necessary
    newButton.addEventListener("click", onDeleteAllCallback); // Add listener to the new button
  }
}

// Function to close the batch replace modal
export function closeBatchReplaceModal() {
  hideBatchReplaceUI();
}

export function showEditBookmarkModal(bookmarkData) {
  dom.editBookmarkIdInput.value = bookmarkData.id;
  dom.editBookmarkTitleInput.value = bookmarkData.title || "";
  dom.editBookmarkUrlInput.value = bookmarkData.url || "";
  dom.editBookmarkModal.style.display = "block";
  dom.editBookmarkTitleInput.focus();
}

export function hideEditBookmarkModal() {
  dom.editBookmarkModal.style.display = "none";
}

export function showOptionsPanel() {
  if (dom.inPageOptionsPanel) dom.inPageOptionsPanel.style.display = "block";
}

export function hideOptionsPanel() {
  if (dom.inPageOptionsPanel) dom.inPageOptionsPanel.style.display = "none";
}

export function populateOptionsUI(searchOnEnterOnly, currentDebounceTime) {
  if (!dom.searchOnEnterInput || !dom.debounceTimeInput) return;

  dom.searchOnEnterInput.checked = searchOnEnterOnly;
  dom.debounceTimeInput.value = currentDebounceTime;
  toggleDebounceInputStateInOptions(searchOnEnterOnly);
}

export function toggleDebounceInputStateInOptions(searchOnEnterOnly) {
  if (dom.debounceTimeInput) {
    dom.debounceTimeInput.disabled = searchOnEnterOnly;
    if (searchOnEnterOnly) {
      dom.debounceTimeInput.parentElement.classList.add("disabled");
    } else {
      dom.debounceTimeInput.parentElement.classList.remove("disabled");
    }
  }
}

export function showOptionsStatus(message, duration = 2000) {
  if (dom.optionsStatusMessage) {
    dom.optionsStatusMessage.textContent = message;
    dom.optionsStatusMessage.style.opacity = "1";
    setTimeout(() => {
      if (dom.optionsStatusMessage)
        dom.optionsStatusMessage.style.opacity = "0";
    }, duration);
  }
}

export function highlightText(
  text,
  find,
  replaceWith,
  highlightClassFind,
  highlightClassReplace
) {
  const safeText = String(text ?? "");

  if (find == null || find === "") {
    const escapedText = escapeHTML(safeText);
    // If find is empty, and replaceWith has content, it implies prepending/replacing entire content.
    // This function is primarily for highlighting matches, so an empty 'find' means no specific match to highlight.
    // However, if we want to show what 'replaceWith' would do to an empty 'find',
    // it means the entire 'safeText' is replaced by 'replaceWith'.
    if (replaceWith !== null && replaceWith !== "") {
      return {
        original: escapedText,
        new: `<span class="${highlightClassReplace}">${escapeHTML(
          replaceWith
        )}</span>`,
        rawNew: replaceWith,
      };
    }
    return { original: escapedText, new: escapedText, rawNew: safeText };
  }
  const safeReplaceWith = String(replaceWith ?? "");
  const findRegex = new RegExp(escapeRegExp(find), "gi"); // 'g' for global, 'i' for case-insensitive

  let highlightedOriginal = "";
  let highlightedNew = "";
  let rawNew = "";
  let lastIndex = 0;
  let matchResult;

  while ((matchResult = findRegex.exec(safeText)) !== null) {
    const nonMatchPart = safeText.substring(lastIndex, matchResult.index);
    highlightedOriginal += escapeHTML(nonMatchPart);
    highlightedNew += escapeHTML(nonMatchPart);
    rawNew += nonMatchPart;

    const matchedText = matchResult[0];
    highlightedOriginal += `<span class="${highlightClassFind}">${escapeHTML(
      matchedText
    )}</span>`;
    highlightedNew += `<span class="${highlightClassReplace}">${escapeHTML(
      safeReplaceWith
    )}</span>`;
    rawNew += safeReplaceWith;

    lastIndex = findRegex.lastIndex;
  }

  const remainingPart = safeText.substring(lastIndex);
  highlightedOriginal += escapeHTML(remainingPart);
  highlightedNew += escapeHTML(remainingPart);
  rawNew += remainingPart;

  return {
    original: highlightedOriginal,
    new: highlightedNew,
    rawNew: rawNew,
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function confirmAction(message) {
  return confirm(message);
}

export function updateBookmarkItemUI(itemElement, newTitle, newUrl) {
  if (!itemElement) return;
  const titleEl = itemElement.querySelector("a.title");
  const urlEl = itemElement.querySelector("p.item-url");
  const faviconEl = itemElement.querySelector(".favicon");

  if (titleEl) {
    titleEl.textContent = newTitle;
    titleEl.href = newUrl;
  }
  if (urlEl) urlEl.textContent = newUrl;
  if (faviconEl) faviconEl.src = getFaviconUrl(newUrl);
  itemElement.dataset.title = newTitle;
  itemElement.dataset.url = newUrl;
}
