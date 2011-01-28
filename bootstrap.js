const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

var self = this, icon;

function include(addon, path) {
  Services.scriptloader.loadSubScript(addon.getResourceURI(path).spec, self);
}

function loadIntoWindow(window) {
  if (!window) return;
  
  let doc = window.document;
  let addonbar = doc.getElementById("addon-bar");
 
  if (addonbar) {
    let button = doc.createElement("toolbarbutton");
    button.setAttribute("id", "bmreplace-button");
    button.setAttribute("label", "Replace Bookmark");
    button.setAttribute("class", "toolbarbutton-1");
    button.setAttribute("tooltiptext", "Replace an existing bookmark");
    button.style.listStyleImage = "url(" + icon + ")";
    button.addEventListener("command", main.action, false);
    addonbar.appendChild(button);
  }
}

function unloadFromWindow(window) {
  if (!window) return;
  let button = window.document.getElementById("bmreplace-button");
  button && button.parentNode.removeChild(button);
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

function runOnLoad (window, callback) {
  window.addEventListener("load", function() {
    window.removeEventListener("load", arguments.callee, false);
    callback(window);
  }, false);
}

function windowWatcher (subject, topic) {
  if (topic === "domwindowopened") {
    runOnLoad(subject, loadIntoWindow);
  }
}

function startup(data, reason) AddonManager.getAddonByID(data.id, function(addon) {
  include(addon, "content/main.js");
  include(addon, "content/bookmarks.js");
  icon = addon.getResourceURI("content/icon.png").spec;
  
  // existing windows
  eachWindow(loadIntoWindow);
  
  // new windows
  Services.ww.registerNotification(windowWatcher);
});

function shutdown(data, reason) {
  Services.ww.unregisterNotification(windowWatcher);
  eachWindow(unloadFromWindow);
}
