# Advanced Library Search (Firefox Extension)

**Advanced Library Search** is a Firefox browser extension that provides a powerful interface to search through your bookmarks and browsing history with advanced filtering options. It's designed for users who want more control and precision when looking for previously visited pages or saved links.

## Features

*   **Unified Search:** Search through bookmarks and history from a single input field.
*   **Targeted Search:**
    *   Prefix `b:` to search only bookmarks.
    *   Prefix `h:` to search only history.
    *   No prefix defaults to searching bookmarks.
*   **Field-Specific Search Terms:**
    *   `-t <term>`: Search for `<term>` specifically in the **title**.
    *   `-u <term>`: Search for `<term>` specifically in the **URL**.
    *   Combine with `b:` or `h:` (e.g., `b: -t "My Report" -u example.com`).
*   **General Search Term:** Any text not associated with `-t` or `-u` will be searched in both title and URL (OR logic) if no specific field options are used, or as an additional AND condition if field options are present.
*   **Advanced Filtering Options:**
    *   `-r`: Treat all search terms (general, title-specific, URL-specific) as **Regular Expressions** (case-insensitive).
    *   `-d <date_spec>`: Filter by **date**.
        *   `YYYY/MM/DD` or `YYYY-MM-DD`: Items on this specific day.
        *   `-YYYY/MM/DD` or `-YYYY-MM-DD`: Items on or before this day.
        *   `YYYY/MM/DD-` or `YYYY-MM-DD-`: Items on or after this day.
        *   `YYYY/MM/DD-YYYY/MM/DD` or `YYYY-MM-DD-YYYY-MM-DD`: Items within this date range (inclusive).    
    *   `-f <glob_pattern>`: (Bookmark search only) Filter bookmarks where their full **Folder Path** matches the provided glob pattern.
        *   The glob pattern is matched against the entire folder path (e.g., `/Bookmarks Menu/Work/Project A`).
        *   `*` matches any characters except `/`.
        *   `**` matches any characters including `/` (can span multiple directory levels).
        *   Examples: `-f "/Work/**/Reports"`, `-f "Project Alpha"`, `-f "**/Urgent"`.
    *   `-m <number>`: (History search only) Set the **Maximum number of results** to retrieve from the browser's history API (e.g., `-m 500`).
*   **Help Option:**
    *   `-h`: Display a detailed help message cottura the search options.
*   **Search Results Display:**
    *   Shows favicon, title (clickable link), URL, date, and relevant metadata (folder path for bookmarks, visit count for history).
    *   **Edit Bookmarks:** An "Edit" button appears for bookmark results, opening a modal to change the title and URL.
    *   **Delete Bookmarks (from Edit Modal):** A "Delete" button is available within the bookmark edit modal.
    *   **Delete History Items:** A "Delete" button appears for individual history results.
    *   **Delete All Displayed History:** A button appears after a history search to delete all currently displayed history items.
*   **Batch Bookmark Replacement:**
    *   After a bookmark search, a "Batch Replace Bookmarks..." button appears.
    *   Clicking it reveals an interface to find text within the titles or URLs of the displayed bookmarks and replace it with new text.
    *   Changes can be previewed, with matched "find" text and "replace with" text highlighted.
    *   Apply changes individually or all at once.
*   **Keyboard Navigation:**
    *   `Ctrl + J`: Focus/activate the title link of the next result item. Stays on the last item if at the end.
    *   `Ctrl + K`: Focus/activate the title link of the previous result item. Stays on the first item if at the top.
    *   `F2`: Focus the main search input field and select its content.
*   **URL Parameter Integration:**
    *   Searches automatically update the URL with `?t=<type>&q=<query_string>` parameters.
    *   Opening the extension's page with these URL parameters will automatically perform the search.
        *   `type (t)`: Can be `bookmark` or `history`.
        *   `query (q)`: The search string *without* the `b: ` or `h: ` prefix (e.g., `hello -t world`). The prefix is reconstructed based on the `type` parameter for display in the search box.
*   **Customizable Search Behavior:**
    *   **Search on Enter Key Only:** Option to disable automatic search-on-type and only search when Enter is pressed. This can be toggled via a UI element next to the search bar or in the options page.
    *   **Debounce Time:** Configurable delay (in milliseconds) after typing stops before a search is automatically initiated (when "Search on Enter" is off).
*   **Theming:** Light and Dark themes selectable via the extension's options page.

## Installation

### From Firefox Add-ons (AMO)

Installation via Mozilla ADD-ONS
https://addons.mozilla.org/en-US/firefox/addon/advanced-library-search/

### Manual Installation (for Development/Testing)

1.  Download the extension files (or clone the repository).
2.  Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3.  Click "Load Temporary Add-on...".
4.  Select the `manifest.json` file from the extension's directory.

## How to Use

1.  **Open the Extension:**
    *   Click the Advanced Library Search extension icon in your browser's toolbar.
    *   Alternatively, use the default shortcut `Ctrl+Alt+O` (or `Command+Alt+O` on macOS).
    *   The search interface will open in a new tab.

2.  **Basic Search:**
    *   Type your search term directly into the input field. By default, this searches bookmarks.
        *   **Note on Performance:** Using advanced options like `-t`, `-u`, `-r`, `-d`, `-f`, or `-m` can sometimes slow down the search, especially with large libraries or complex patterns. If you experience slowness, consider using the "Search on Enter Key Only" mode to avoid frequent re-searches while typing.
        *   This mode can be toggled via the icon next to the search bar or in the extension's options.

    *   Examples:
        *   Example: `project report` (searches bookmarks for "project report" in title or URL)
    *   To search history: `h: browser extension`
    *   To explicitly search bookmarks: `b: firefox tips`

3.  **Using Options:**
    Options are typically appended after your main search terms or field-specific terms.

    *   **Title-only search:**
        `b: -t "Quarterly Review"` (Searches bookmarks where the title contains "Quarterly Review")
    *   **URL-only search:**
        `h: -u example.com/articles` (Searches history where the URL contains "example.com/articles")
    *   **Combined title and URL specific terms:**
        `b: -t "API Documentation" -u developer.mozilla.org`
        (Searches bookmarks where title contains "API Documentation" AND URL contains "developer.mozilla.org")
    *   **General term with specific field term:**
        `b: firefox -t "Performance Tips"`
        (Searches bookmarks for "firefox" (in title OR URL) AND where the title specifically contains "Performance Tips")
    *   **Regular Expression search:**
        `h: -u "github\.com/.*/(issues|pulls)" -r`
        (Searches history for URLs matching the regex, like GitHub issues or pull requests)
    *   **Date filtering:**
        *   `b: -d 2023/10/20` (Bookmarks from October 20, 2023)
        *   `h: project -d -2024/01/01` (History items for "project" on or before Jan 1, 2024)
        *   `b: -t important -d 2023/06/15-` (Bookmarks titled "important" on or after June 15, 2023)
        *   `h: news -d 2023/01/01-2023/03/31` (History items for "news" between Jan 1 and Mar 31, 2023)
    *   **Folder filtering (bookmarks only):**
        *   `b: -f Work` (Bookmarks directly in a folder named "Work")
        *   `b: -f "/Bookmarks Toolbar/Shopping/*"` (Bookmarks in any folder directly under `/Bookmarks Toolbar/Shopping`)
        *   `b: -f "**/Archive"` (Bookmarks in any folder named "Archive" at any depth)
        *   `b: -t recipe -f "Recipes/Dinner/**"` (Bookmarks with "recipe" in title, located in any subfolder under a "Recipes/Dinner" path)
    *   **Max results (history only):**
        *   `h: research -m 50` (Retrieves up to 50 history items for "research")
    *   **Displaying Help:**
        `b: -h` or `h: -h` or simply `-h`

4.  **Interacting with Results:**
    *   **Open:** Click on the title of a result item to open it in a new tab.
    *   **Edit (Bookmarks):** Click the "Edit" button. A modal will appear allowing you to change the title and URL. Save or cancel your changes.
    *   **Delete (from Edit Modal for Bookmarks):** Click the "Delete Bookmark" button within the edit modal to remove the bookmark.
    *   **Delete (History):** Click the "Delete" button on a history item to remove that specific URL from your history.
    *   **Keyboard Navigation:**
        *   Use `Ctrl + J` and `Ctrl + K` keys to move focus between result item titles.
        *   Press `Enter` on a focused title to open it (this is standard browser behavior for focused links).
        *   Press `F2` to quickly return focus to the search input field.

5.  **Batch Replacing Bookmarks:**
    *   After performing a bookmark search (`b: ...`), if results are found, a "Batch Replace Bookmarks..." button will appear below the search results.
    *   Click this button to show the replacement UI.
    *   **Find text:** Enter the text you want to find in the titles or URLs of the displayed bookmarks.
    *   **Replace with:** Enter the text you want to replace the found text with. Leaving this empty will effectively delete the "Find text".
    *   **Preview Changes:** Click this to see a list of bookmarks that will be affected and how their titles/URLs will change. The "Find text" and "Replace with" portions will be highlighted.
    *   **Apply This Change:** In the preview list, each item will have an "Apply This Change" button to apply the modification to only that specific bookmark.
    *   **Apply All Visible Changes:** After previewing, this button (if changes are pending) will apply all modifications shown in the preview area. A confirmation will be required.

6.  **Changing Search Mode:**
    *   Next to the search input field, you'll see an icon/text (e.g., `↵` or `Aa`). This indicates the current search mode.
    *   `↵` (or similar): Search on Enter key only. Type your query and press Enter.
    *   `Aa` (or similar): Search as you type (with a debounce delay).
    *   Click this icon/text to toggle between the two modes. The setting is saved.

7.  **Opening via URL Parameters:**
    *   You can bookmark or share a URL like:
        `moz-extension://[EXTENSION-ID]/index.html?t=b&q=recipe%20-t%20chicken`
    *   When this URL is opened, the extension will automatically populate the search box with `b: recipe -t chicken` and perform the search.

8.  **Options Page:**
    *   Click the `⚙` (gear) icon next to the search bar, or go to Firefox's Add-ons manager, find "Advanced Library Search", and click "Preferences".
    *   Here you can:
        *   Change the color theme (Light/Dark).
        *   Set the debounce time for search-as-you-type.
        *   Toggle the "Search on Enter key only" behavior.

### Use as a search engine.

To use this extension as a search engine (e.g., via a keyword bookmark in Firefox), bookmark the following URL template and assign a keyword to it. The `%s` will be replaced by your search terms:

  * Search Bookmark
  ```
  moz-extension://[EXTENSION-ID]/index.html?t=b&q=%s
  ```
  
  * Search History
  ```
  moz-extension://[EXTENSION-ID]/index.html?t=h&q=%s
  ```

## Development

This section provides information for developers looking to contribute or understand the extension's structure.

### Adding New Themes

The extension supports custom themes. To add a new theme:

1.  **Create a New CSS File:**
    *   In the `/css/` directory, create a new CSS file for your theme (e.g., `theme-yourthemename.css`).

2.  **Define Theme Styles:**
    *   Inside your new CSS file, define the theme-specific styles using CSS custom properties. These properties should be scoped under a unique class that will be applied to the `<body>` tag.
    *   Example (`/css/theme-yourthemename.css`):
        ```css
        body.yourthemename-theme {
          --background-color: #f0f0f0;
          --text-color: #333333;
          --link-color: #0066cc;
          /* ... other theme-specific variables ... */
        }
        ```

3.  **Register the Theme in `index.html`:**
    *   Open `/index.html`.
    *   In the `<head>` section, add a new `<link>` tag to include your theme's CSS file. This tag **must** include the following `data-*` attributes:
        *   `data-theme-id`: A unique, short identifier for your theme (e.g., "yourthemename"). This ID is used internally and for saving the user's preference.
        *   `data-theme-name`: A user-friendly name for your theme that will be displayed in the theme selection dropdown (e.g., "Your Theme Name").
        *   `data-theme-class`: The CSS class name you defined in your theme's CSS file (e.g., "yourthemename-theme").
    *   Example:
        ```html
        <link rel="stylesheet" type="text/css" href="css/theme-yourthemename.css" data-theme-id="yourthemename" data-theme-name="Your Theme Name" data-theme-class="yourthemename-theme">
        ```

4.  **Done!**
    *   The JavaScript theme manager (`/js/theme.js`) will automatically detect the new theme from the `<link>` tag in `index.html` and populate the theme selection dropdown in the options panel.


## License

Mozilla Public License Version 2.0
