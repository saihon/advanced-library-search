function getElementByIdSafe(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`DOM element with ID '${id}' not found.`);
  return el;
}

export const dom = {
  get searchInput() {
    return getElementByIdSafe("searchInput");
  },
  get searchModeToggle() {
    return getElementByIdSafe("searchModeToggle");
  },
  get optionsButton() {
    return getElementByIdSafe("optionsButton");
  },
  get resultsContainer() {
    return getElementByIdSafe("resultsContainer");
  },
  get batchReplaceToggleButtonContainer() {
    return getElementByIdSafe("batchReplaceToggleButtonContainer");
  },
  get toggleReplaceUIButton() {
    return getElementByIdSafe("toggleReplaceUIButton");
  },
  get bookmarkReplaceContainer() {
    return getElementByIdSafe("bookmarkReplaceContainer");
  },
  get replaceInTitleCheckbox() {
    return getElementByIdSafe("replaceInTitleCheckbox");
  },
  get replaceInUrlCheckbox() {
    return getElementByIdSafe("replaceInUrlCheckbox");
  },
  get replaceFindInput() {
    return getElementByIdSafe("replaceFindInput");
  },
  get replaceWithInput() {
    return getElementByIdSafe("replaceWithInput");
  },
  get applyAllReplaceButton() {
    return getElementByIdSafe("applyAllReplaceButton");
  },
  get batchReplaceModal() {
    return getElementByIdSafe("batchReplaceModal");
  },
  get closeBatchReplaceModalButton() {
    return getElementByIdSafe("closeBatchReplaceModal");
  },
  get replacePreviewArea() {
    return getElementByIdSafe("replacePreviewArea");
  },
  get editBookmarkModal() {
    return getElementByIdSafe("editBookmarkModal");
  },
  get closeEditModalButton() {
    return getElementByIdSafe("closeEditModalButton");
  },
  get editBookmarkIdInput() {
    return getElementByIdSafe("editBookmarkId");
  },
  get editBookmarkTitleInput() {
    return getElementByIdSafe("editBookmarkTitle");
  },
  get editBookmarkUrlInput() {
    return getElementByIdSafe("editBookmarkUrl");
  },
  get saveBookmarkButton() {
    return getElementByIdSafe("saveBookmarkChangesButton");
  },
  get deleteBookmarkButtonModal() {
    return getElementByIdSafe("deleteBookmarkFromModalButton");
  },
  get inPageOptionsPanel() {
    return getElementByIdSafe("inPageOptionsPanel");
  },
  get closeOptionsPanelButton() {
    return getElementByIdSafe("closeOptionsPanelButton");
  },
  get themeSelector() {
    return getElementByIdSafe("themeSelector");
  },
  get debounceTimeInput() {
    return getElementByIdSafe("debounceTimeInput");
  },
  get searchOnEnterInput() {
    return getElementByIdSafe("searchOnEnterInput");
  },
  get optionsStatusMessage() {
    return getElementByIdSafe("optionsStatusMessage");
  },
  get clearAllHistoryButtonContainer() {
    return getElementByIdSafe("clearAllHistoryButtonContainer");
  },
  get clearAllHistoryButton() {
    return getElementByIdSafe("clearAllHistoryButton");
  },
};
