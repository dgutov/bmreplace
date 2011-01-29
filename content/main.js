"use strict";

let prompts = Services.prompt;
let prefs = Services.prefs;

const TITLE = "Replace Bookmark",
      URL_NOT_SUPPORTED = "Sorry, the current page's URL is not supported.",
      RELATED_NOT_FOUND = "Sorry, no related bookmarks found.",
      ALREADY_BOOKMARKED = "The current page is already bookmarked.",
      SELECT_BOOKMARK = "Which bookmark do you want to replace?";

const PREFS_BRANCH = Services.prefs.getBranch("extensions.bmreplace."),
      POS_PREF_NAME = "button-position",
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
      let values = PREFS_BRANCH.getCharPref(POS_PREF_NAME).split(",");
      return {
        toolbarId: values[0],
        nextItemId: values[1]
      };
    } catch(e) {
      return {
        // TODO
      };
    }
  },
  
  setPrefs: function(toolbarId, nextItemId) {
    let value = "";
    toolbarId && (value += toolbarId);
    nextItemId && (value += "," + nextItemId);
    PREFS_BRANCH.setCharPref(POS_PREF_NAME, value);
  }
};

