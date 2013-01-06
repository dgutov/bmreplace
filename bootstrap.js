const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

var self = this, icon, prefHandlers = [];

function include(path) {
  Services.scriptloader.loadSubScript(addon.getResourceURI(path).spec, self);
}

var addon = {
  getResourceURI: function(filePath) ({
    spec: __SCRIPT_URI_SPEC__ + "/../" + filePath
  })
};

function $(node, childId) {
  if (node.getElementById) {
    return node.getElementById(childId);
  } else {
    return node.querySelector("#" + childId);
  }
}

var prefsObserver = {
  observe: function(subject, topic, data) {
    if (topic == "nsPref:changed") {
      prefHandlers.forEach(function(func) {func(data);});
    }
  }
};

function modify(window) {
  if (!window) return;

  let doc = window.document,
      win = doc.querySelector("window");

  // Add toolbar button
  let button = doc.createElement("toolbarbutton");
  button.setAttribute("id", BUTTON_ID);
  button.setAttribute("label", _("label"));
  button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
  button.setAttribute("tooltiptext", _("tooltip"));
  button.style.listStyleImage = "url(" + icon + ")";
  button.addEventListener("command", main.action, false);
  restorePosition(doc, button);

  // Add shortcut
  let keyset = appendKeyset(doc, win);

  let handlerIdx = prefHandlers.push(function(name) {
    switch (name) {
    case PREF_SHORTCUT_KEY:
    case PREF_SHORTCUT_MODIFIERS:
      win.removeChild(keyset);
      keyset = appendKeyset(doc, win);
    }
  }) - 1;

  if (getPref(PREF_MENU_ITEM)) {
    // Bookmarks toolbar menu
    let menuItem = doc.createElement("menuitem"),
        bookmarksItem = $(doc, "BMB_bookmarksToolbar");

    if (!bookmarksItem) { // not on any of the toolbars
      let palette = $(doc, "navigator-toolbox").palette;
      bookmarksItem = $(palette, "BMB_bookmarksToolbar");
    }

    menuItem.setAttribute("class", "menuitem-iconic");
    menuItem.setAttribute("label", _("label"));
    menuItem.setAttribute("key", KEY_ID);
    menuItem.style.listStyleImage = "url(" + icon + ")";
    menuItem.addEventListener("command", main.action, false);
    bookmarksItem.parentNode.insertBefore(menuItem,
                                          bookmarksItem.previousSibling);

    // Main bookmarks menu
    let menuItem2 = menuItem.cloneNode(),
        allTabsItem = $(doc, "menu_bookmarkAllTabs");
    menuItem2.addEventListener("command", main.action, false);
    allTabsItem.parentNode.insertBefore(menuItem2, allTabsItem);

    // Appmenu bookmarks menu
    let menuItem3 = menuItem.cloneNode(),
        appmenuItem = $(doc, "appmenu_bookmarksToolbar");
    menuItem3.addEventListener("command", main.action, false);
    appmenuItem.parentNode.insertBefore(menuItem3, appmenuItem.previousSibling);

    unload(function() {
      menuItem.parentNode.removeChild(menuItem);
      allTabsItem.parentNode.removeChild(menuItem2);
      appmenuItem.parentNode.removeChild(menuItem3);
    }, window);
  }

  unload(function() {
    button.parentNode.removeChild(button);
    keyset.parentNode.removeChild(keyset);
    prefHandlers.splice(handlerIdx, 1);
  }, window);
}

function appendKeyset(doc, win) {
  let keyset = doc.createElement("keyset");
  keyset.setAttribute("id", KEYSET_ID);
  let replaceKey = doc.createElement("key");
  replaceKey.setAttribute("id", KEY_ID);
  replaceKey.setAttribute("key", getPref(PREF_SHORTCUT_KEY));
  replaceKey.setAttribute("modifiers", getPref(PREF_SHORTCUT_MODIFIERS));
  replaceKey.setAttribute("oncommand", "void(0);");
  replaceKey.addEventListener("command", main.action, true);
  keyset.appendChild(replaceKey);
  win.appendChild(keyset);
  return keyset;
}

function makeOptionsObserver (id) {
  return {
    observe: function(subject, topic, data) {
      if (data == id) {
        var doc = subject;
        var menulist = doc.getElementById("bmreplace-keys-menulist");
        if (menulist.childNodes.length == 0) {
          let popup = doc.createElement("menupopup"),
              a = "a".charCodeAt(0),
              z = "z".charCodeAt(0);
          for (let c = a; c <= z; c++) {
            let item = doc.createElement("menuitem"),
                s = String.fromCharCode(c);
            item.setAttribute("value", s);
            item.setAttribute("label", s);
            popup.appendChild(item);
          };
          menulist.appendChild(popup);
        }
        menulist.value = getPref(PREF_SHORTCUT_KEY);
      }
    }
  };
};

function startup(data, reason) {
  include("content/main.js");
  include("content/bookmarks.js");
  include("includes/utils.js");
  include("includes/l10n.js");
  include("includes/buttons.js");
  include("includes/prefs.js");
  icon = addon.getResourceURI("content/icon.png").spec;

  l10n(addon, "bmr.properties");
  unload(l10n.unload);

  if (ADDON_INSTALL == reason) {
    setDefaultPosition(BUTTON_ID, "nav-bar", "bookmarks-menu-button-container");
    main.setLastVersion(data.version);
  };

  if (ADDON_UPGRADE == reason) {
    upgrade(data.version);
  }

  setDefaultPrefs();

  watchWindows(modify, "navigator:browser");

  let optionsObserver = makeOptionsObserver(data.id),
      branch = Services.prefs.getBranch(PREF_BRANCH);

  branch.addObserver("", prefsObserver, false);
  Services.obs.addObserver(optionsObserver, "addon-options-displayed", false);

  unload(function() {
    branch.removeObserver("", prefsObserver);
    Services.obs.removeObserver(optionsObserver, "addon-options-displayed");
  });
};

function shutdown(data, reason) unload();

function install() {}

function uninstall() {}

function upgrade(version) {
  let lastVersion = getPref(PREF_VERSION),
      prefs = Services.prefs;

  if (lastVersion < "1.2") {
    prefs.deleteBranch("extensions.bmreplace.button-position.");
  }

  if (lastVersion < "1.3") {
    let ktTag = "keep-title";
    try {
      let name = "extensions.bmreplace.keep-title-tag";
      ktTag = prefs.getCharPref(name);
      prefs.deleteBranch(name);
    } catch(e) {}

    let bms = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
          .getService(Ci.nsINavBookmarksService),
        ts = Cc["@mozilla.org/browser/tagging-service;1"]
          .getService(Ci.nsITaggingService);
    for each (let uri in ts.getURIsForTag(ktTag)) {
      for each (let id in bms.getBookmarkIdsForURI(uri)) {
        bm.setKeepTitle(id, true);
      }
    }
  }

  getPref.branch.setCharPref(PREF_VERSION, version);
}
