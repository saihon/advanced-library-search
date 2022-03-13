
const openTab = () => {
    chrome.tabs.query({active : true, currentWindow : true}, tabs => {
        const tab = tabs[0];
        chrome.tabs.create(
            {
              url : 'index.html',
              active : true,
              // index : tab.index + 1,
            });
    });
};
chrome.browserAction.onClicked.addListener(openTab);