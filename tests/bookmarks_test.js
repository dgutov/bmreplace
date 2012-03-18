function addBookmark(url, title) {
  let uri = ios.newURI(url, null, null),
      id = bms.insertBookmark(bms.unfiledBookmarksFolder, uri,
                              bms.DEFAULT_INDEX, title);
  undo(function() bms.removeItem(id));
  return id;
}

function assertRelatedBookmarks(expected, url) {
  assertArraysEqual(expected, bm.getRelatedBookmarks(url).map(function(b) b.uri));
}

test("isBookmarked", function() {
  let url = "http://google.com/?q=zyzyx";
  assertFalse(bm.isBookmarked(url));
  addBookmark(url, "Zyzyx!");
  assertTrue(bm.isBookmarked(url));
});

test("matchWeight ignores domains", function() {
  assertEqual(6, bm.matchWeight("http://a.c/abc/d", "http://b/abc/de"));
});

test("getRelatedBookmarks", function() {
  let urls = ["/a/e", "/a/b/", "/b/b", "/a/b/c"]
        .map(function(path) "http://abc.com" + path),
      url = urls.pop();
  urls.forEach(addBookmark);
  assertRelatedBookmarks([urls[1], urls[0], urls[2]], url);
});

test("shows candidates with www subdomain added or stripped", function() {
  let urls = ["http://abc.com/a/a", "http://www.abc.com/a/a"];
  urls.forEach(addBookmark);
  assertRelatedBookmarks([urls[0], urls[1]], urls[0].slice(0, -2));
  assertRelatedBookmarks([urls[1], urls[0]], urls[1].slice(0, -2));
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
