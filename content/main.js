"use strict";

let prompts = Services.prompt;
let prefs = Services.prefs;

const TITLE = "Replace Bookmark",
      URL_NOT_SUPPORTED = "Sorry, the current page's URL is not supported.",
      RELATED_NOT_FOUND = "Sorry, no related bookmarks found.",
      ALREADY_BOOKMARKED = "The current page is already bookmarked.",
      SELECT_BOOKMARK = "Which bookmark do you want to replace?";

const PREFS_BRANCH = Services.prefs.getBranch("extensions.bmreplace.button-position."),
      PREF_TB = "toolbar",
      PREF_NEXT = "next-item",
      BUTTON_ID = "bmreplace-button";

let main = {
  action: function() {
    let window = Services.wm.getMostRecentWindow("navigator:browser");
    let doc = window.content.document;
    let url = doc.location.toString();
    if (!bm.DOMAIN_REGEX.test(url)) {
      prompts.alert(window, TITLE, URL_NOT_SUPPORTED);
      return;
    }
    if (bm.isBookmarked(url)) {
      prompts.alert(window, TITLE, ALREADY_BOOKMARKED);
      return;
    }
    let bookmarks = bm.getRelatedBookmarks(url);
    if (!bookmarks.length) {
      prompts.alert(window, TITLE, RELATED_NOT_FOUND);
      return;
    }
    let titles = [b.title for each (b in bookmarks)];
    let selected = {};
    let ok = prompts.select(window, TITLE, SELECT_BOOKMARK, titles.length,
                            titles, selected);
    if (ok) {
      let bookmark = bookmarks[selected.value];
      bm.replaceBookmark(bookmark.id, url, doc.title);
    }
  },
  
  /*
   * @return {toolbarId, nextItemId}
   */
  getPrefs: function() {
    try {
      return {
        toolbarId: PREFS_BRANCH.getCharPref(PREF_TB),
        nextItemId: PREFS_BRANCH.getCharPref(PREF_NEXT)
      };
    } catch(e) {
      return { // default position
        toolbarId: "nav-bar",
        nextItemId: "bookmarks-menu-button-container"
      };
    }
  },
  
  setPrefs: function(toolbarId, nextItemId) {
    PREFS_BRANCH.setCharPref(PREF_TB, toolbarId);
    PREFS_BRANCH.setCharPref(PREF_NEXT, nextItemId);
  }
};

