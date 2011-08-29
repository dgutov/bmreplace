function addBookmark(url, title) {
  let uri = ios.newURI(url, null, null),
      id = bms.insertBookmark(bms.unfiledBookmarksFolder, uri,
                              bms.DEFAULT_INDEX, title);
  undo(function() bms.removeItem(id));
  return id;
}

test("isBookmarked", function() {
  let url = "http://google.com/?q=zyzyx";
  assertFalse(bm.isBookmarked(url));
  addBookmark(url, "Zyzyx!");
  assertTrue(bm.isBookmarked(url));
});

test("getRelatedBookmarks", function() {
  let urls = ["/a/e", "/a/b/", "/b/b", "/a/b/c"]
        .map(function(path) "http://abc.com" + path),
      url = urls.pop();
  urls.forEach(addBookmark);
  assertArraysEqual([urls[1], urls[0], urls[2]],
                    bm.getRelatedBookmarks(url).map(function(b) b.uri));
});

test("replaceBookmark", function() {
  let pairs = [["http://www.google.com/?q=xzxz",
                "http://www.google.com/?q=zxzx"],
               ["http://www.rcsec.osaka-u.ac.jp/",
                "http://www.rcsec.osaka-u.ac.jp/index-e.html"]];
  pairs.forEach(function(pair) {
    let [a, b] = pair,
        id = addBookmark(a);
    bm.replaceBookmark(id, b, "aaa");
    assertFalse(bm.isBookmarked(a));
    assertTrue(bm.isBookmarked(b));
  });
});
