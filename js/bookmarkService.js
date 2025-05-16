import { highlightText } from "./ui.js";
import { escapeHTML } from "./utils.js";

// Canonical (non-localized) IDs for special root folders in Firefox
// "menu________", // Bookmarks Menu
// "toolbar_____", // Bookmarks Toolbar
// "unfiled_____", // Other Bookmarks
// "mobile______", // Mobile Bookmarks

// --- Glob Matching Logic ---

/**
 * Gets the next logical segment (directory name, '*', '**') from a string.
 * Slashes are treated as separators.
 * @param {string} str - The string to parse (path or pattern).
 * @param {number} currentIndex - The index to start parsing from.
 * @returns {{segment: string|null, nextIndex: number}}
 */
function getNextLogicalSegment(str, currentIndex) {
  if (currentIndex >= str.length) {
    return { segment: null, nextIndex: str.length };
  }

  let i = currentIndex;
  // Skip leading slashes for the current segment search
  while (i < str.length && str[i] === "/") {
    i++;
  }

  if (i >= str.length) {
    // Reached end after skipping slashes
    return { segment: null, nextIndex: str.length };
  }

  const segmentStart = i;
  // Find end of segment (next slash or end of string)
  while (i < str.length && str[i] !== "/") {
    i++;
  }

  const segment = str.substring(segmentStart, i);
  return { segment, nextIndex: i }; // nextIndex is at the slash or end
}

/**
 * Matches a glob pattern segment against a path segment.
 * @param {string} pathSegment - The path segment to match (e.g., "baz").
 * @param {string} globSegment - The glob pattern segment (e.g., "b*", "ba?", "baz").
 * @returns {boolean} True if it matches, false otherwise.
 */
function matchesSegmentGlob(pathSegment, globSegment) {
  if (globSegment === "*") return true; // Simple '*' matches any segment name
  // For more complex globs like "b*z" or "ba?", convert to regex for this segment
  let regexString = "";
  for (let i = 0; i < globSegment.length; i++) {
    const char = globSegment[i];
    if (char === "*") {
      regexString += ".*";
    } else if (char === "?") {
      regexString += ".";
    } else if (".+^${}()|[]\\".includes(char)) {
      regexString += "\\" + char;
    } else {
      regexString += char;
    }
  }
  try {
    const regex = new RegExp("^" + regexString + "$", "i"); // Case-insensitive segment match
    return regex.test(pathSegment);
  } catch (e) {
    console.warn(
      `Invalid glob segment pattern "${globSegment}" converted to regex:`,
      e
    );
    return false; // Treat invalid segment patterns as non-matching
  }
}

/**
 * Determines if a node path string matches a glob pattern string.
 * @param {string} nodePathStr - The node path to match (e.g., "/foo/bar").
 * @param {string} globPatternStr - The glob pattern (e.g., "/foo/*", "*\*\/bar").
 * @returns {boolean} True if the path matches the glob pattern.
 */
function pathMatchesGlob(nodePathStr, globPatternStr) {
  // Normalize: if glob doesn't start with '/' or '**/' , prepend '**/' to match anywhere.
  let effectiveGlob = globPatternStr;
  if (!effectiveGlob.startsWith("/") && !effectiveGlob.startsWith("**/")) {
    effectiveGlob = "**/" + effectiveGlob;
  }

  // Recursive matching function
  function recurseMatch(pathIndex, patternIndex) {
    const patternSegResult = getNextLogicalSegment(effectiveGlob, patternIndex);
    const currentPatternSegment = patternSegResult.segment;

    if (currentPatternSegment === null) {
      // End of pattern
      // If end of pattern, path must also be at its end (or only slashes left)
      const remainingPathCheck = getNextLogicalSegment(nodePathStr, pathIndex);
      return remainingPathCheck.segment === null;
    }

    if (currentPatternSegment === "**") {
      // Try matching rest of pattern with current path
      if (recurseMatch(pathIndex, patternSegResult.nextIndex)) return true;
      // Try consuming one path segment and matching '**' again with the next path segment
      const pathSegResult = getNextLogicalSegment(nodePathStr, pathIndex);
      if (pathSegResult.segment !== null) {
        if (recurseMatch(pathSegResult.nextIndex, patternIndex)) return true;
      }
      return false; // '**' couldn't be satisfied
    }

    // Regular segment (literal, '*', or '?')
    const pathSegResult = getNextLogicalSegment(nodePathStr, pathIndex);
    const currentPathSegment = pathSegResult.segment;

    if (currentPathSegment === null) return false; // Path ended, but pattern hasn't

    if (matchesSegmentGlob(currentPathSegment, currentPatternSegment)) {
      return recurseMatch(pathSegResult.nextIndex, patternSegResult.nextIndex);
    }
    return false;
  }
  return recurseMatch(0, 0);
}

/**
 * Determines if a given folder path (currentPath) or its descendants
 * could potentially match the globPattern, considering the current depth.
 * This is a heuristic for pruning the search tree.
 *
 * @param {string} currentPath The path of the folder currently being considered for exploration.
 * @param {string} globPattern The user-provided glob pattern for folder filtering.
 * @returns {boolean} True if the path should be explored, false if it can be safely pruned.
 */
function shouldExplorePath(currentPath, globPattern) {
  if (!globPattern) return true; // No glob pattern, so explore everything.

  // Normalize currentPath: Remove trailing slashes for consistency, ensure it's at least "/"
  const path = currentPath.replace(/\/+$/, "") || "/";

  // Normalize globPattern similar to pathMatchesGlob:
  // If glob doesn't start with '/' or '**/' , prepend '**/' to match anywhere.
  let effectiveGlob = globPattern.replace(/\/+$/, ""); // Remove trailing slashes first
  if (!effectiveGlob.startsWith("/") && !effectiveGlob.startsWith("**/")) {
    effectiveGlob = "**/" + effectiveGlob;
  }

  const globSegments = effectiveGlob.split("/").filter(Boolean);

  if (globSegments.length === 0) return true; // Empty glob pattern should match all

  // Check for '**' at the beginning of the glob pattern
  if (globSegments[0] === "**") {
    // If the pattern starts with '**', it's hard to prune effectively
    // without a deeper match. For safety and correctness with patterns like '**/foo/bar',
    // it's better to explore and let pathMatchesGlob do the precise matching.
    return true;
  }

  // Handle globs that do NOT start with '**'.
  // These are "absolute" paths relative to the virtual root of bookmarks.
  // The currentPath must be a prefix of the glob pattern (or match it up to a wildcard).
  const pathSegments = path.split("/").filter(Boolean);
  let pIdx = 0;
  let gIdx = 0;

  while (gIdx < globSegments.length) {
    // If we've consumed all path segments, but glob has more,
    // it means currentPath is a prefix of the glob, so we should explore.
    if (pIdx >= pathSegments.length) return true;
    // Directly compare segments using your existing matchesSegmentGlob.
    if (!matchesSegmentGlob(pathSegments[pIdx], globSegments[gIdx])) {
      return false; // Segments don't match, prune.
    }
    pIdx++;
    gIdx++;
  }
  // If all glob segments matched corresponding path segments (or path was shorter), explore.
  return true;
}
// --- End of Glob Matching Logic ---

// Helper function to apply all filters to a single bookmark node
function applyFilters(node, generalSearchTerm, options) {
  if (!node.url) return false; // Skip non-bookmarks or bookmarks without URLs

  let match = true;

  // 1. General search term filtering
  if (generalSearchTerm) {
    if (options.regex) {
      const mainRgx = new RegExp(generalSearchTerm, "i");
      if (!(mainRgx.test(node.title || "") || mainRgx.test(node.url))) {
        match = false;
      }
    } else {
      // The browser.bookmark.search API only searches the first space-separated word in a string.
      // So herewe try to match the remaining words. In that case should do .slice(1) but...
      const searchTerms = generalSearchTerm.toLocaleLowerCase().split(/\s+/);
      const titleLower = node.title ? node.title.toLocaleLowerCase() : "";
      const urlLower = node.url ? node.url.toLocaleLowerCase() : "";
      for (const s of searchTerms) {
        if (!titleLower.includes(s) && !urlLower.includes(s)) {
          match = false;
          break;
        }
      }
    }
  }
  if (!match) return false;

  // 2. Title search term filtering (options.titleSearchTerm is RegExp or string from parser)
  if (options.titleSearchTerm) {
    if (!node.title) {
      match = false;
    } else if (
      options.regex &&
      typeof options.titleSearchTerm.test === "function"
    ) {
      if (!options.titleSearchTerm.test(node.title)) match = false;
    } else if (typeof options.titleSearchTerm === "string") {
      if (
        !node.title
          .toLowerCase()
          .includes(options.titleSearchTerm.toLowerCase())
      )
        match = false;
    }
  }
  if (!match) return false;

  // 3. URL search term filtering (options.urlSearchTerm is RegExp or string from parser)
  if (options.urlSearchTerm) {
    if (options.regex && typeof options.urlSearchTerm.test === "function") {
      if (!options.urlSearchTerm.test(node.url)) match = false;
    } else if (typeof options.urlSearchTerm === "string") {
      if (!node.url.toLowerCase().includes(options.urlSearchTerm.toLowerCase()))
        match = false;
    }
  }
  if (!match) return false;

  // 4. Date filtering (options.date is {startDate, endDate} or null from parser)
  if (options.date && node.dateAdded) {
    const itemTime = node.dateAdded;
    if (
      options.date.startDate !== undefined &&
      itemTime < options.date.startDate
    ) {
      match = false;
    }
    if (
      options.date.endDate !== undefined &&
      itemTime >= options.date.endDate
    ) {
      match = false;
    }
  } else if (options.date && !node.dateAdded) {
    match = false;
  }
  if (!match) return false;

  return match;
}

function applyFiltersWithGlobMatch(
  node,
  folderPath,
  generalSearchTerm,
  options
) {
  if (!node.url) return false; // Skip non-bookmarks or bookmarks without URLs

  // Folder path filtering (options.folder is already a RegExp or null from parser)
  // This filter requires the path. Only apply if path is provided and folder option is present.
  if (options.folder && folderPath !== undefined && folderPath !== null) {
    // Check if path is explicitly provided
    if (!pathMatchesGlob(folderPath, options.folder)) return false;
  }

  return applyFilters(node, generalSearchTerm, options);
}

// Performs a recursive walk of the bookmark tree and applies filters.
async function walkAndFilterBookmarksTree(generalSearchTerm, options) {
  const filteredResults = [];

  const matcher = function (folderPath = "", node = null) {
    // Use the extracted filter logic
    if (
      applyFiltersWithGlobMatch(node, folderPath, generalSearchTerm, options)
    ) {
      // Add folderPath to the result object for display
      // We already have the path string, so just add it
      filteredResults.push({
        type: "bookmark",
        data: { ...node, folderPath: folderPath },
      });
    }
  };

  const walker = async function (folderPath = "", folderId = "") {
    // Pruning check at the beginning of the walker for the current folderPath
    if (options.folder && !shouldExplorePath(folderPath, options.folder)) {
      // console.log(`Skipping folder by shouldExplorePath: ${folderPath}`);
      return; // Do not explore this path further
    }

    let children;

    try {
      // Use browser.bookmarks.getChildren, which returns a Promise
      children = await browser.bookmarks.getChildren(folderId);
    } catch (e) {
      console.warn(`Error getting children for folder ${folderId}:`, e);
      return; // Stop exploring this branch if an error occurs
    }

    for (let child of children) {
      // If it's a folder, recursively call walker and wait for completion
      if (child.type && child.type !== "bookmark") {
        // It's a folder
        // Build the full path for the child folder
        const childFolderPath = child.title
          ? folderPath === "/"
            ? "/" + child.title
            : folderPath + "/" + child.title
          : folderPath;
        await walker(childFolderPath, child.id);
      } else {
        // It's a bookmark or separator
        // If it's a bookmark, call matcher
        // The path for a bookmark is its parent folder's path
        // Pass the path so folderPath can be used within the matcher function
        matcher(folderPath, child);
      }
    }
  };

  // Start the walk from the root children
  // Get the root node using browser.bookmarks.getTree() and start from its children
  // The walkAndFilterTree function itself should return results after the entire traversal is complete

  let rootNodes;
  try {
    const tree = await browser.bookmarks.getTree();
    rootNodes = tree[0].children; // tree[0] is the root node
  } catch (e) {
    console.error("Error getting bookmark tree:", e);
    throw e; // Error before starting traversal
  }

  // Start walker for each child of the root node and wait for all traversals to complete
  const walkPromises = rootNodes.map(async (node) => {
    // For root children, path starts with / and its title, or just / if title is empty (unlikely for actual folders)
    const currentPath = node.title ? "/" + node.title : "/"; // Path for this root-level node
    // The shouldExplorePath check will be done at the beginning of the walker call.
    // No need for a separate check here before calling walker, as the walker itself
    // will perform the pruning check for `currentPath`.
    await walker(currentPath, node.id); // Pass options.folder to walker
  });

  await Promise.all(walkPromises); // Wait for all recursive walker calls to complete

  return filteredResults; // Return the array after traversal and filtering are complete
}

async function getAndFilterBookmarksUsingApi(generalSearchTerm, options) {
  // Use the standard API search for other cases
  let queryForAPI = {};

  // Use API's direct filtering only if not in regex mode for that specific term.
  // If in regex mode, or if the term is meant for regex, API query should be broad,
  // and filtering will be done manually in applyPostFilters.
  // Also, API search doesn't support date or folder filtering directly in the query object.
  // So, only apply general, title, url terms if NOT in regex mode.

  // Note on browser.bookmarks.search API behavior:
  // When queryForAPI is an object:
  // - queryForAPI.query: Performs a general search (usually partial match) on titles and URLs.
  // - queryForAPI.title: Matches the bookmark title verbatim (exact match).
  // - queryForAPI.url: Matches the bookmark URL verbatim (exact match).
  // For partial title/url matches, it's often better to use queryForAPI.query and then filter results client-side if needed.
  if (!options.regex && generalSearchTerm) {
    // Searching with the entire generalSearchTerm (including spaces) results in an exact match.
    // For keyword matching, searches only for the first space-delimited word.
    const searchTerm = generalSearchTerm.split(/\s+/, 1).at(0);
    queryForAPI.query = searchTerm;
  } else if (
    options.titleSearchTerm &&
    typeof options.titleSearchTerm === "string"
  ) {
    // If titleSearchTerm is a string (not regex), add it to API query
    queryForAPI.query = options.titleSearchTerm;
  } else if (
    options.urlSearchTerm &&
    typeof options.urlSearchTerm === "string"
  ) {
    // If urlSearchTerm is a string (not regex), add it to API query
    queryForAPI.query = options.urlSearchTerm;
  }

  // API search does not support date or folder filtering in the query object.
  // These will be handled in applyPostFilters.

  let bookmarks;
  try {
    // If queryForAPI is empty (e.g., all terms are regex or no terms),
    // browser.bookmarks.search({}) or browser.bookmarks.search("") will fetch all bookmarks.
    // https://developer.chrome.com/docs/extensions/reference/api/bookmarks#method-search
    bookmarks = await browser.bookmarks.search(queryForAPI);
  } catch (e) {
    console.error("Error searching bookmarks:", e);
    throw new Error("Failed to search bookmarks.");
  }

  let filteredResults = [];
  // Apply post-filtering for options not handled well by API search (regex, date, folder if somehow present)
  // applyPostFilters will fetch folderPath for each item.
  // bookmarks = await applyPostFilters(bookmarks, generalSearchTerm, options);
  for (const bm of bookmarks) {
    // Use the extracted filter logic
    // Pass the fetched folderPath

    if (applyFilters(bm, generalSearchTerm, options)) {
      // Add folderPath to the result object for display
      let folderPath = "/";
      const parent = await browser.bookmarks.get(bm.parentId);
      if (
        parent &&
        parent.length > 0 &&
        parent[0].parentId !== "root________"
      ) {
        folderPath = parent[0].title;
      }
      filteredResults.push({
        type: "bookmark",
        data: { ...bm, folderPath: folderPath },
      });
    }
  }
  return filteredResults;
}

export async function searchBookmarks(generalSearchTerm, options) {
  let bookmarks = []; // This will hold the raw API results or the results from the walk

  // Decide whether to use tree walk or API search
  if (options.folder) {
    // Use the tree walk function when folder filtering is needed
    // The walkAndFilterTree function itself handles getting the tree and filtering
    bookmarks = await walkAndFilterBookmarksTree(generalSearchTerm, options);
  } else {
    bookmarks = await getAndFilterBookmarksUsingApi(generalSearchTerm, options);
  }
  // Ensure folderPath is added for display purposes for all results
  // This is now handled within walkAndFilterTree and applyPostFilters.
  // No need for a separate loop here.

  return bookmarks; // Return the final filtered list
}

export async function saveBookmark(bookmarkId, newTitle, newUrl) {
  if (!bookmarkId) throw new Error("Bookmark ID is required.");
  try {
    const changes = {};
    if (newTitle !== undefined) changes.title = newTitle;
    if (newUrl !== undefined) changes.url = newUrl;

    if (Object.keys(changes).length === 0) {
      console.warn("No changes to save for bookmark:", bookmarkId);
      return null; // Or return the existing bookmark data
    }
    const updatedBookmark = await browser.bookmarks.update(bookmarkId, changes);
    return updatedBookmark;
  } catch (e) {
    console.error("Error saving bookmark:", e);
    throw new Error(`Failed to save bookmark: ${e.message}`);
  }
}

export async function deleteBookmark(bookmarkId) {
  if (!bookmarkId) throw new Error("Bookmark ID is required.");
  try {
    await browser.bookmarks.remove(bookmarkId);
  } catch (e) {
    console.error("Error deleting bookmark:", e);
    throw new Error(`Failed to delete bookmark: ${e.message}`);
  }
}

export function generateBookmarkReplacePreview(
  bookmarks,
  findText,
  replaceText,
  inTitle,
  inUrl
) {
  const previewItems = [];
  let changesMade = 0;

  bookmarks.forEach((bm) => {
    const originalTitle = bm.data.title || "";
    const originalUrl = bm.data.url || "";
    let titlePreview = {
      original: escapeHTML(originalTitle),
      new: escapeHTML(originalTitle),
      rawNew: originalTitle,
      changed: false,
    };
    let urlPreview = {
      original: escapeHTML(originalUrl),
      new: escapeHTML(originalUrl),
      rawNew: originalUrl,
      changed: false,
    };

    if (inTitle) {
      const highlighted = highlightText(
        originalTitle,
        findText,
        replaceText,
        "highlight-find",
        "highlight-replace"
      );
      titlePreview = {
        ...highlighted,
        changed: highlighted.rawNew !== originalTitle,
      };
    }
    if (inUrl) {
      const highlighted = highlightText(
        originalUrl,
        findText,
        replaceText,
        "highlight-find",
        "highlight-replace"
      );
      urlPreview = {
        ...highlighted,
        changed: highlighted.rawNew !== originalUrl,
      };
    }

    if (titlePreview.changed || urlPreview.changed) {
      changesMade++;
    }

    previewItems.push({
      id: bm.data.id,
      originalTitle,
      originalUrl,
      titlePreview,
      urlPreview,
      applied: false, // Track if this specific change has been applied
      error: null,
    });
  });

  return { previewItems, changesMade };
}

export async function applySingleBookmarkChange(bookmarkId, newTitle, newUrl) {
  try {
    await saveBookmark(bookmarkId, newTitle, newUrl);
    return { success: true, id: bookmarkId, newTitle, newUrl };
  } catch (e) {
    console.error(`Error applying change to bookmark ${bookmarkId}:`, e);
    return { success: false, id: bookmarkId, error: e.message };
  }
}

export async function applyAllBookmarkChanges(previewItems) {
  let successCount = 0;
  let errorCount = 0;

  for (const item of previewItems) {
    if (item.applied) {
      // Skip already applied items
      // results.push({ id: item.id, status: "skipped_applied", newTitle: item.titlePreview.rawNew, newUrl: item.urlPreview.rawNew });
      continue;
    }
    if (!item.titlePreview.changed && !item.urlPreview.changed) {
      // results.push({ id: item.id, status: "skipped_no_change", newTitle: item.originalTitle, newUrl: item.originalUrl });
      continue;
    }

    const newTitle = item.titlePreview.rawNew;
    const newUrl = item.urlPreview.rawNew;

    // Basic URL validation (browser.bookmarks.update will also validate)
    if (
      !newUrl ||
      (!newUrl.startsWith("http:") &&
        !newUrl.startsWith("https:") &&
        !newUrl.startsWith("ftp:") &&
        !newUrl.startsWith("file:"))
    ) {
      item.error = "Invalid URL format.";
      // results.push({ id: item.id, status: "error", error: item.error, newTitle, newUrl });
      errorCount++;
      continue;
    }

    try {
      await saveBookmark(item.id, newTitle, newUrl);
      item.applied = true; // Mark as applied
      item.error = null;
      // results.push({ id: item.id, status: "success", newTitle, newUrl });
      successCount++;
    } catch (e) {
      item.error = e.message;
      // results.push({ id: item.id, status: "error", error: e.message, newTitle, newUrl });
      errorCount++;
    }
  }
  return { successCount, errorCount, updatedPreviewItems: previewItems };
}
