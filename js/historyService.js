const DEFAULT_MAX_RESULTS_HISTORY = 300;

export async function searchHistory(generalSearchTerm, options) {
  let queryObj = {
    text: options.regex && generalSearchTerm ? "" : generalSearchTerm || "", // If regex is used for general term, API text search should be broad or empty
    maxResults: options.maxResults || DEFAULT_MAX_RESULTS_HISTORY,
    startTime: 0, // Default to searching from the beginning of time
  };

  // Apply date filtering from parsed -d option
  if (options.date) {
    if (options.date.startDate !== undefined) {
      queryObj.startTime = options.date.startDate;
    }
    if (options.date.endDate !== undefined) {
      // browser.history.search endTime is exclusive.
      // Our parser's endDate is set to the start of the day *after* the desired range end to include the last day fully.
      queryObj.endTime = options.date.endDate;
    }
  }

  let historyItems = [];
  try {
    historyItems = await browser.history.search(queryObj);
  } catch (e) {
    console.error("Error searching history:", e);
    throw new Error("Failed to search history.");
  }

  const filteredResults = [];
  for (const item of historyItems) {
    if (!item.url) continue; // Skip items without URLs

    let match = true;

    // Manual date check as a workaround for potential inconsistencies
    // in browser.history.search API's date filtering, which sometimes
    // returns items outside the specified startTime/endTime range,
    // particularly near boundaries or with specific date formats/values.
    if (options.date) {
      const itemTime = item.lastVisitTime; // This is a timestamp from the history item
      if (
        options.date.startDate !== undefined &&
        itemTime < options.date.startDate
      ) {
        match = false;
      }
      // options.date.endDate is the start of the day *after* the desired last day.
      // So, itemTime must be less than options.date.endDate.
      if (
        options.date.endDate !== undefined &&
        itemTime >= options.date.endDate
      ) {
        match = false;
      }
    }

    // Post-filtering for title if -t is used
    if (options.titleSearchTerm) {
      if (!item.title) {
        match = false;
      } else if (
        options.regex &&
        typeof options.titleSearchTerm.test === "function"
      ) {
        // Check if it's a RegExp
        if (!options.titleSearchTerm.test(item.title)) match = false;
      } else if (typeof options.titleSearchTerm === "string") {
        if (
          !item.title
            .toLowerCase()
            .includes(options.titleSearchTerm.toLowerCase())
        )
          match = false;
      }
    }

    // Post-filtering for URL if -u is used
    if (options.urlSearchTerm) {
      if (options.regex && typeof options.urlSearchTerm.test === "function") {
        // Check if it's a RegExp
        if (!options.urlSearchTerm.test(item.url)) match = false;
      } else if (typeof options.urlSearchTerm === "string") {
        if (
          !item.url.toLowerCase().includes(options.urlSearchTerm.toLowerCase())
        )
          match = false;
      }
    }

    // If general search term was a regex, apply it here as API's `text` doesn't support regex
    if (
      options.regex && // Check if regex mode is enabled
      generalSearchTerm // And if there's a general search term
    ) {
      // generalSearchTerm is always a string from the parser.
      // If options.regex is true, we treat this string as a regex pattern.
      // The API query's `text` field was set to "" in this case.
      const mainTermRegex = new RegExp(generalSearchTerm, "i");
      if (
        !(mainTermRegex.test(item.title || "") || mainTermRegex.test(item.url))
      )
        match = false;
    }

    if (match) {
      filteredResults.push({ type: "history", data: item });
    }
  }
  return filteredResults;
}

export async function deleteHistoryItem(url) {
  if (!url) throw new Error("URL is required to delete a history item.");
  try {
    await browser.history.deleteUrl({ url: url });
  } catch (e) {
    console.error(`Error deleting history for URL ${url}:`, e);
    throw new Error(`Failed to delete history item: ${e.message}`);
  }
}

export async function deleteAllHistoryItems(urls) {
  if (!urls || urls.length === 0) {
    console.warn("No URLs provided to delete.");
    return { successCount: 0, errorCount: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  for (const url of urls) {
    try {
      await browser.history.deleteUrl({ url: url });
      successCount++;
    } catch (e) {
      console.error(`Error deleting history for URL ${url}:`, e);
      errorCount++;
      // Optionally, collect errors or decide to stop on first error
    }
  }
  return { successCount, errorCount };
}
