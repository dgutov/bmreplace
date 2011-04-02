"use strict";

let bms = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
  .getService(Ci.nsINavBookmarksService);
let hs = Cc["@mozilla.org/browser/nav-history-service;1"]
  .getService(Ci.nsINavHistoryService);
let ios = Services.io;

let bm = {
  DOMAIN_REGEX: /:\/\/([^/]*)/,
  
  /*
   * Checks if there is a bookmark with given URL.
   * @param url URL string.
   */
  isBookmarked: function(url) {
    return bms.isBookmarked(ios.newURI(url, null, null));
  },

  /*
   * Finds bookmarks related to the given url, sorts them by
   * the length of the common substring (starting from the beginning).
   * @return [{title, uri, id, weight}, ...].
   */
  getRelatedBookmarks: function(url) {
    let query = hs.getNewQuery();
    query.domain = this.DOMAIN_REGEX.exec(url)[1];
    query.domainIsHost = true;
    query.onlyBookmarked = true;
    let options = hs.getNewQueryOptions();
    options.queryType = Ci.nsINavHistoryQueryOptions.QUERY_TYPE_BOOKMARKS;
    let root = hs.executeQuery(query, options).root;
    root.containerOpen = true;
    let lst = [];
    for (var i = 0, len = root.childCount; i < len; ++i) {
      let child = root.getChild(i);
      lst.push({
        title: child.title,
        uri: child.uri,
        id: child.itemId,
        weight: this.getMatchWeight(url, child.uri)
      });
    };
    root.containerOpen = false;
    lst.sort(function(a, b) b.weight - a.weight); // better matches first
    return lst;
  },
  
  getMatchWeight: function(u, v) {
    let max = Math.min(u.length, v.length);
    for (var i = 0; i < max && u[i] == v[i]; ++i) {}
    return i;
  },
  
  /*
   * Replaces the old bookmark with a new one with given URL.
   * Retains the folder and the bookmark's position in it.
   * @param id old bookmark ID.
   * @param url URL string for the new bookmark.
   * @return New bookmark ID.
   */
  replaceBookmark: function(id, url, title) {
    let idx = bms.getItemIndex(id);
    let folder = bms.getFolderIdForItem(id);
    bms.removeItem(id);
    return bms.insertBookmark(folder, ios.newURI(url, null, null), idx, title);
  }
};
