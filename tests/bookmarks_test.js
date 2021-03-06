function addBookmark(url, title) {
  let uri = ios.newURI(url, null, null),
      id = bms.insertBookmark(bms.unfiledBookmarksFolder, uri,
                              bms.DEFAULT_INDEX, title);
  undo(() => bms.removeItem(id));
  return id;
}

function assertRelatedBookmarks(expected, url, title) {
  assertArraysEqual(expected,
                    bm.getRelatedBookmarks(url, title).map((b) => b.uri));
}

test("isBookmarked", function() {
  let url = "http://google.com/?q=zyzyx";
  assertFalse(bm.isBookmarked(url));
  let id = addBookmark(url, "Zyzyx!");
  bm.setDescription(id, "Aoaoau");
  assertEqual(bm.WRONG_TITLE, bm.isBookmarked(url));
  assertEqual(bm.WRONG_DESC, bm.isBookmarked(url, "Zyzyx!", "Wipwip"));
  assertEqual(true, bm.isBookmarked(url, "Zyzyx!"));
  assertEqual(true, bm.isBookmarked(url, "Zyzyx!", "Aoaoau"));
});

test("matchWeight comparePaths", function() {
  assertEqual(6, bm.matchWeight("http://a.c/abc/d", "http://b/abc/de", true));
});

test("matchWeight full strings", function() {
  assertEqual(7, bm.matchWeight("http://a.c/abc/d", "http://b/abc/de"));
});

test("isDomainSpecial", function() {
  assertFalse(bm.isDomainSpecial("abc.com"));
});

test("isDomainSpecial youtube", function() {
  assertTrue(bm.isDomainSpecial("youtube.com"));
});

test("isDomainSpecial youtube dot is not wilcard", function() {
  assertFalse(bm.isDomainSpecial("youtubedcom"));
});

test("isDomainSpecial www.youtube", function() {
  assertTrue(bm.isDomainSpecial("www.youtube.com"));
});

test("isDomainSpecial myyoutube", function() {
  assertFalse(bm.isDomainSpecial("myyoutube.com"));
});

test("getRelatedBookmarks", function() {
  let urls = ["/a/e", "/a/b/", "/b/b", "/a/b/c"]
        .map((path) => "http://abc.com" + path),
      url = urls.pop();
  urls.forEach(function(url, index) {
    addBookmark(url, ["a", "b", "c"][index]);
  });
  assertRelatedBookmarks([urls[1], urls[0], urls[2]], url, "a");
});

test("getRelatedBookmarks on a special domain", function() {
  let urls = ["/a/e", "/a/b/", "/b/b", "/a/e/c"]
        .map((path) => "http://youtube.com" + path),
      url = urls.pop();
  urls.forEach(function(url, index) {
    addBookmark(url, ["ab", "aa", "c"][index]);
  });
  assertRelatedBookmarks([urls[1], urls[0], urls[2]], url, "aaa");
});

test("getRelatedBookmarks special looks at all substrings", function() {
  let urls = ["/a/e", "/a/b/", "/b/b", "/a/e/c"]
        .map((path) => "http://youtube.com" + path),
      url = urls.pop();
  urls.forEach(function(url, index) {
    addBookmark(url, ["tttab", "ttaa", "tc"][index]);
  });
  assertRelatedBookmarks([urls[1], urls[0], urls[2]], url, "zzzaaa");
});

test("getRelatedBookmarks special gives priority to prefix match", function() {
  let urls = ["/a/e", "/a/b/", "/b/b", "/a/e/c"]
        .map((path) => "http://youtube.com" + path),
      url = urls.pop();
  urls.forEach(function(url, index) {
    addBookmark(url, ["tttaaaaa", "zzaa", "tc"][index]);
  });
  assertRelatedBookmarks([urls[1], urls[0], urls[2]], url, "zzzaaaaaa");
});

test("shows candidates with www subdomain added or stripped", function() {
  let urls = ["http://abc.com/a/a", "http://www.abc.com/a/a"];
  urls.forEach(addBookmark);
  assertRelatedBookmarks([urls[0], urls[1]], urls[0].slice(0, -2), "foo");
  assertRelatedBookmarks([urls[1], urls[0]], urls[1].slice(0, -2), "foo");
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

test("replaceBookmark moves keywords", function() {
  let res = [], kwd1 = "foo", kwd2 = "bar",
      url1 = "http://fff.com",
      url2 = "http://eee.com";
  bm.setKeywordUrl(kwd1, url1).then(function() {
    bm.setKeywordUrl(kwd2, url1).then(function() {
      let id = addBookmark(url1);
      bm.replaceBookmark(id, url2, "zzz");
      waitFor(100);
      bm.forEachKeyword(url2, function(val) {
        res.push(val);
      });
    });
  });
  undo(function() {
    PlacesUtils.keywords.remove(kwd1);
    PlacesUtils.keywords.remove(kwd2);
  });
  waitFor(100);
  assertEqual(kwd1, res[0]);
  assertEqual(kwd2, res[1]);
});

test("setDescription", function() {
  let id = addBookmark("http://bbb.ddd");
  assertEqual("", PlacesUIUtils.getItemDescription(id));
  bm.setDescription(id, "abcd");
  assertEqual("abcd", PlacesUIUtils.getItemDescription(id));
});

test("firstBookmarkFor", function() {
  let url = "http://def.com";
  assertEqual(null, bm.firstBookmarkFor(url));
  let id = addBookmark(url);
  assertEqual(id, bm.firstBookmarkFor(url));
});

test("setKeywordUrl", function() {
  let url = "http://def.com",
      kwd = "foo",
      done = false;
  bm.setKeywordUrl(kwd, url).then(function() { done = true; });
  undo(function() { PlacesUtils.keywords.remove(kwd); });
  waitFor(100);
  assertEqual(true, done);
});

test("forEachKeyword", function() {
  let res = [], url = "http://deff.com", kwd = "foo";
  bm.setKeywordUrl(kwd, url).then(function() {
    bm.forEachKeyword(url, function(val) {
      res.push(val);
    });
  }, function() { res = "fail"; });
  undo(function() { PlacesUtils.keywords.remove(kwd); });
  waitFor(100);
  assertEqual(1, res.length);
  assertEqual(kwd, res[0]);
});
