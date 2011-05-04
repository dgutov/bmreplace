"use strict";

let prompts = Services.prompt,
    prefs = Services.prefs,
    ww = Services.ww;

const PREFS_BRANCH = Services.prefs.getBranch("extensions.bmreplace."),
      PREF_VERSION = "version",
      BUTTON_ID = "bmreplace-button",
      KEYSET_ID = "bmreplace-keyset";

let main = {
  action: function() {
    let window = Services.wm.getMostRecentWindow("navigator:browser"),
        doc = window.content.document,
        url = doc.location.toString(),
        title = _("label");
    
    if (!bm.DOMAIN_REGEX.test(url)) {
      prompts.alert(window, title, _("urlNotSupported"));
      return;
    }
    if (bm.isBookmarked(url)) {
      prompts.alert(window, title, _("alreadyBookmarked"));
      return;
    }
    let bookmarks = bm.getRelatedBookmarks(url);
    if (!bookmarks.length) {
      let btn = prompts.confirmEx(window, title, _("relatedNotFound"),
                                  prompts.STD_YES_NO_BUTTONS +
                                  prompts.BUTTON_POS_1_DEFAULT,
                                  "", "", null, null, {});
      if (btn == 0) {
        bm.showAddBookmark(url, doc.title);
      }
      return;
    }
    let titles = [b.title for each (b in bookmarks)],
        states = [b.checked for each (b in bookmarks)],
        result = {},
        ok = main.select(window, title, _("selectBookmark"), titles.length,
                         titles, states, result);
    if (ok) {
      let checked = result.checked,
          idx = result.value,
          bookmark = bookmarks[idx];
      if (checked != states[idx]) {
        bm.setKeepTitle(bookmark.id, checked);
      }
      bm.replaceBookmark(bookmark.id, url, !checked && doc.title);
    } else if (result.addNew) {
      bm.showAddBookmark(url, doc.title);
    }
  },

  select: function(window, title, text, count, options, states, result) {
    function modifySelect(subject, topic) {
      if (topic == "domwindowopened") {
        ww.unregisterNotification(modifySelect);
        
        runOnLoad(subject, function(window) {
          let doc = window.document,
              cb = doc.createElement("checkbox"),
              list = $(doc, "list"),
              vbox = list.parentNode,
              accept = doc.documentElement.getButton("accept"),
              extra2 = doc.documentElement.getButton("extra2");
          
          cb.setAttribute("label", _("keepOldTitle"));
          vbox.appendChild(cb);
          extra2.hidden = false;
          extra2.label = _("newBookmark");
          extra2.parentNode.querySelector("spacer").hidden = false;
          list.setAttribute("rows", 7);
          vbox.setAttribute("flex", "1");
          vbox.parentNode.setAttribute("flex", "1");
          vbox.parentNode.style.width = "26em";
          window.sizeToContent();
          
          list.addEventListener("select", function() {
            cb.checked = states[list.selectedIndex];
          }, false);
          
          accept.addEventListener("command", function() {
            result.checked = cb.checked;
          }, false);
          
          extra2.addEventListener("command", function() {
            result.addNew = true;
            window.close();
          }, false);
        }, "");
      }
    }
    
    ww.registerNotification(modifySelect);
    
    let bag = {
      QueryInterface: function() { return this; },
      getProperty: function(name) { return this[name]; },
      setProperty: function(name, value) { this[name] = value; },
      promptType: "select",
      title: title,
      text: text,
      list: options
    };
    
    window.openDialog("chrome://global/content/selectDialog.xul",
                      "_blank", "modal,resizable,centerscreen", bag);
    result.value = bag.selected;
    return bag.ok;
  },
  
  getLastVersion: function() {
    try {
      return PREFS_BRANCH.getCharPref(PREF_VERSION);
    } catch(e) {
      return null;
    }
  },
  
  setLastVersion: function(version) {
    PREFS_BRANCH.setCharPref(PREF_VERSION, version);
  }
};

