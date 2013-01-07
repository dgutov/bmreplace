"use strict";

Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

let prompts = Services.prompt,
    prefs = Services.prefs,
    ww = Services.ww;

const PREF_BRANCH = "extensions.bmreplace.",
      PREF_VERSION = "version",
      PREF_MENU_ITEM = "add-menu-item",
      PREF_DESCRIPTION = "update-description",
      PREF_KEEP_TITLE = "keep-title-default",
      PREF_ONE_NO_PROMPT = "no-prompt-if-one",
      PREF_SHORTCUT_KEY = "shortcut-key",
      PREF_SHORTCUT_MODIFIERS = "shortcut-modifiers",
      PREF_SPECIAL_DOMAINS = "special-domains",
      PREFS = {},
      BUTTON_ID = "bmreplace-button",
      KEYSET_ID = "bmreplace-keyset",
      KEY_ID = "bmreplace-key";

PREFS[PREF_VERSION]       = "0.0";
PREFS[PREF_MENU_ITEM]     = true;
PREFS[PREF_DESCRIPTION]   = true;
PREFS[PREF_KEEP_TITLE]    = false;
PREFS[PREF_ONE_NO_PROMPT] = false;
PREFS[PREF_SHORTCUT_KEY]       = "d";
PREFS[PREF_SHORTCUT_MODIFIERS] = "shift,alt";
PREFS[PREF_SPECIAL_DOMAINS] = "youtube.com,vimeo.com,blip.tv";

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

    let bookmarks = bm.getRelatedBookmarks(url, doc.title);
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
        checked, idx, addNew, ok;

    if (titles.length == 1 && getPref(PREF_ONE_NO_PROMPT)) {
      checked = states[0], idx = 0, ok = true;
    } else {
      let result = {};
      ok = main.select(window, title, _("selectBookmark"), titles.length,
                       titles, states, result);
      checked = result.checked;
      idx = result.value;
      addNew = result.addNew;
    }

    if (ok) {
      let bookmark = bookmarks[idx];
      if (checked != states[idx]) {
        bm.setKeepTitle(bookmark.id, checked);
      }
      bm.replaceBookmark(bookmark.id, url, !checked && doc.title,
                         getPref(PREF_DESCRIPTION) &&
                         PlacesUIUtils.getDescriptionFromDocument(doc),
                         PrivateBrowsingUtils.isWindowPrivate(window));
    } else if (addNew) {
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
  }
};
