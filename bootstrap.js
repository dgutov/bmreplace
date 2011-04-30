const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

var self = this, icon;

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

function loadIntoWindow(window) {
  if (!window) return;
  
  let doc = window.document,
      win = doc.querySelector("window");
  
  if (win.id != "main-window") return;
  
  // add button
  let button = doc.createElement("toolbarbutton");
  button.setAttribute("id", BUTTON_ID);
  button.setAttribute("label", _("label"));
  button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
  button.setAttribute("tooltiptext", _("tooltip"));
  button.style.listStyleImage = "url(" + icon + ")";
  button.addEventListener("command", main.action, false);
  restorePosition(doc, button);
  
  // add hotkey
  let keyset = doc.createElement("keyset");
  keyset.setAttribute("id", KEYSET_ID);
  let replaceKey = doc.createElement("key");
  replaceKey.setAttribute("key", "D");
  replaceKey.setAttribute("modifiers", "accel,alt");
  replaceKey.setAttribute("oncommand", "void(0);");
  replaceKey.addEventListener("command", main.action, true);
  keyset.appendChild(replaceKey);
  win.appendChild(keyset);
}

function unloadFromWindow(window) {
  if (!window) return;
  
  let doc = window.document;
  let button = $(doc, BUTTON_ID) ||
    $($(doc, "navigator-toolbox").palette, BUTTON_ID);
  button && button.parentNode.removeChild(button);
  let keyset = $(doc, KEYSET_ID);
  keyset.parentNode.removeChild(keyset);
  
  l10n.unload();
}

function eachWindow(callback) {
  let enumerator = Services.wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    if (win.document.readyState === "complete") {
      callback(win);
    } else {
      runOnLoad(win, callback);
    }
  }
}

function runOnLoad(window, callback) {
  window.addEventListener("load", function() {
    window.removeEventListener("load", arguments.callee, false);
    callback(window);
  }, false);
}

function windowWatcher(subject, topic) {
  if (topic === "domwindowopened") {
    runOnLoad(subject, loadIntoWindow);
  }
}

function startup(data, reason) {
  include("content/main.js");
  include("content/bookmarks.js");
  include("includes/l10n.js");
  include("includes/buttons.js");
  icon = addon.getResourceURI("content/icon.png").spec;
  
  l10n(addon, "bmr.properties");
  
  if (ADDON_INSTALL == reason) {
    setDefaultPosition(BUTTON_ID, "nav-bar", "bookmarks-menu-button-container");
  };
  
  if (ADDON_UPGRADE == reason) {
    upgrade(data.version);
  }
  
  // new windows
  Services.ww.registerNotification(windowWatcher);
      
  // existing windows
  eachWindow(loadIntoWindow);
};

function shutdown(data, reason) {
  Services.ww.unregisterNotification(windowWatcher);
  eachWindow(unloadFromWindow);
}

function upgrade(version) {
  let lastVersion = main.getLastVersion();
  
  if (lastVersion < "1.2") {
    Services.prefs.getBranch("extensions.bmreplace.button-position.")
      .deleteBranch("");
  }
  
  main.setLastVersion(version);
}
