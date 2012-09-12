"use strict";

let prompts = Services.prompt,
    prefs = Services.prefs,
    ww = Services.ww;

const PREFS_BRANCH = Services.prefs.getBranch("extensions.bmreplace."),
      DEFAULTS_BRANCH = Services.prefs.getDefaultBranch("extensions.bmreplace."),
      PREF_VERSION = "version",
      PREF_MENU_ITEM = "add-menu-item",
      PREF_DESCRIPTION = "update-description",
      PREF_KEEP_TITLE = "keep-title-default",
      BUTTON_ID = "bmreplace-button",
      KEYSET_ID = "bmreplace-keyset",
      KEY_ID = "bmreplace-key";

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
    let res = bm.isBookmarked(url, doc.title);
    if (res) {
      if (res == bm.WRONG_TITLE) {
        if (prompts.confirm(window, title, _("updateTitle"))) {
          bm.setTitle(url, doc.title);
        }
      } else {
        prompts.alert(window, title, _("alreadyBookmarked"));
      }
      return;
    }
    let bookmarks = bm.getRelatedBookmarks(url);
    if (!bookmarks.length) {
      let btn = prompts.confirmEx(window, title, _("relatedNotFound"),
                                  prompts.STD_YES_NO_BUTTONS +
                                  prompts.BUTTON_POS_1_DEFAULT,
                                  "", "", null, null, {});
      if (btn == 0) {
        bm.showAddBookmark(url, doc.title, window);
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
      bm.replaceBookmark(bookmark.id, url, !checked && doc.title,
                         PREFS_BRANCH.getBoolPref(PREF_DESCRIPTION) &&
                         PlacesUIUtils.getDescriptionFromDocument(doc));
    } else if (result.addNew) {
      bm.showAddBookmark(url, doc.title, window);
    }
  },

  select: function(window, title, text, count, options, states, result) {
    function modifySelect(subject, topic) {
      if (topic == "domwindowopened") {
        ww.unregisterNotification(modifySelect);

        runOnLoad(subject, function(window) {
          let doc = window.document,
              dialog = doc.documentElement,
              cb = doc.createElement("checkbox"),
              list = $(doc, "list"),
              vbox = list.parentNode,
              extra2 = dialog.getButton("extra2");

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

          let updateChecked = function() {
            result.checked = cb.checked;
          };

          list.addEventListener("dblclick", updateChecked, false);
          dialog.addEventListener("dialogaccept", updateChecked, false);

          list.addEventListener("select", function() {
            cb.checked = states[list.selectedIndex];
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
