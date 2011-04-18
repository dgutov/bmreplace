const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

var self = this, icon;

function include(addon, path) {
  Services.scriptloader.loadSubScript(addon.getResourceURI(path).spec, self);
}

function $(node, childId) {
  if (node.getElementById) {
    return node.getElementById(childId);
  } else {
    return node.querySelector("#" + childId);
  }
}

function loadIntoWindow(window) {
  if (!window) return;
  
  let doc = window.document;
  let toolbox = $(doc, "navigator-toolbox");
  
  if (toolbox) { // navigator window
    // add to palette
    let button = doc.createElement("toolbarbutton");
    button.setAttribute("id", BUTTON_ID);
    button.setAttribute("label", _("label"));
    button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
    button.setAttribute("tooltiptext", _("tooltip"));
    button.style.listStyleImage = "url(" + icon + ")";
    button.addEventListener("command", main.action, false);
    toolbox.palette.appendChild(button);
    
    // move to saved toolbar position
    let {toolbarId, nextItemId} = main.getToolbarPrefs(),
        toolbar = toolbarId && $(doc, toolbarId);
    if (toolbar) {
      let nextItem = $(doc, nextItemId);
      toolbar.insertItem(BUTTON_ID, nextItem &&
                         nextItem.parentNode.id == toolbarId &&
                         nextItem);
    }
    window.addEventListener("aftercustomization", afterCustomize, false);
    
    // add hotkey
    let keyset = doc.createElement("keyset");
    keyset.setAttribute("id", KEYSET_ID);
    let replaceKey = doc.createElement("key");
    replaceKey.setAttribute("key", "D");
    replaceKey.setAttribute("modifiers", "accel,alt");
    replaceKey.setAttribute("oncommand", "void(0);");
    replaceKey.addEventListener("command", main.action, true);
    keyset.appendChild(replaceKey);
    doc.querySelector("window").appendChild(keyset);
  }
}

function afterCustomize(e) {
  let toolbox = e.target;
  let button = $(toolbox.parentNode, BUTTON_ID);
  let toolbarId, nextItemId;
  if (button) {
    let parent = button.parentNode,
        nextItem = button.nextSibling;
    if (parent && parent.localName == "toolbar") {
      toolbarId = parent.id;
      nextItemId = nextItem && nextItem.id;
    }
  }
  main.setToolbarPrefs(toolbarId, nextItemId);
}

function unloadFromWindow(window) {
  if (!window) return;
  
  let doc = window.document;
  let button = $(doc, BUTTON_ID) ||
    $($(doc, "navigator-toolbox").palette, BUTTON_ID);
  button && button.parentNode.removeChild(button);
  let keyset = $(doc, KEYSET_ID);
  keyset.parentNode.removeChild(keyset);
  
  window.removeEventListener("aftercustomization", afterCustomize, false);
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

function startup(data, reason) AddonManager.getAddonByID(data.id, function(addon) {
  include(addon, "content/main.js");
  include(addon, "content/bookmarks.js");
  include(addon, "includes/l10n.js");
  icon = addon.getResourceURI("content/icon.png").spec;
  
  l10n(addon, "bmr.properties");
  
  // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=632898
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback({notify: function() {
    // new windows
    Services.ww.registerNotification(windowWatcher);
      
    // existing windows
    eachWindow(loadIntoWindow);
  }}, 0, Ci.nsITimer.TYPE_ONE_SHOT);
});

function shutdown(data, reason) {
  Services.ww.unregisterNotification(windowWatcher);
  eachWindow(unloadFromWindow);
}
