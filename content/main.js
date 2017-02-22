/*global Cu, Services, getPref, bm, PrivateBrowsingUtils */
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
      PREF_DIALOG_WIDTH = "dialog.width",
      PREF_DIALOG_ROWS  = "dialog.rows",
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
PREFS[PREF_DIALOG_WIDTH]  = 26;
PREFS[PREF_DIALOG_ROWS]   = 7;

let main = {
  action: function() {
    let window = Services.wm.getMostRecentWindow("navigator:browser"),
        tabMM = window.gBrowser.selectedBrowser.messageManager,
        listener = function({data}) {
          tabMM.removeMessageListener("bmreplace:callback", listener);
          main.doIt(window, data.url, data.title, data.description);
        };
    // https://developer.mozilla.org/en-US/Firefox/Multiprocess_Firefox/Message_Manager/Performance#Load_frame_scripts_on_demand
    tabMM.addMessageListener("bmreplace:callback", listener);
    tabMM.loadFrameScript("chrome://bmreplace/content/frame-script.js", true);
  },

  doIt: function(window, url, docTitle, docDescription) {
    let title = _("label"),
        description = getPref(PREF_DESCRIPTION) && docDescription;

    if (!bm.DOMAIN_REGEX.test(url)) {
      prompts.alert(window, title, _("urlNotSupported"));
      return;
    }

    let res = bm.isBookmarked(url, docTitle, description);
    if (res) {
      if (res == bm.WRONG_TITLE) {
        if (prompts.confirm(window, title, _("updateTitle"))) {
          bm.setTitle(url, docTitle);
        }
      } else if (res == bm.WRONG_DESC) {
        if (prompts.confirm(window, title, _("updateDesc"))) {
          bm.setDescription(bm.firstBookmarkFor(url), description);
        }
      } else {
        prompts.alert(window, title, _("alreadyBookmarked"));
      }
      return;
    }

    let bookmarks = bm.getRelatedBookmarks(url, docTitle);
    if (!bookmarks.length) {
      let btn = prompts.confirmEx(window, title, _("relatedNotFound"),
                                  prompts.STD_YES_NO_BUTTONS +
                                  prompts.BUTTON_POS_1_DEFAULT,
                                  "", "", null, null, {});
      if (btn == 0) {
        bm.showAddBookmark(url, docTitle, window);
      }
      return;
    }

    let titles = bookmarks.map((b) => b.title),
        checked, idx, addNew, ok;

    if (titles.length == 1 && getPref(PREF_ONE_NO_PROMPT)) {
      checked = bookmarks[0].checked, idx = 0, ok = true;
    } else {
      let result = {};
      ok = main.select(window, title, _("selectBookmark"), bm.getDomain(url),
                       titles, bookmarks, result);
      checked = result.checked;
      idx = result.value;
      addNew = result.addNew;
    }

    if (ok) {
      let bookmark = bookmarks[idx];
      if (checked != bookmark.checked) {
        bm.setKeepTitle(bookmark.id, checked);
      }
      bm.replaceBookmark(bookmark.id, url, !checked && docTitle,
                         description,
                         PrivateBrowsingUtils.isWindowPrivate(window));
    } else if (addNew) {
      bm.showAddBookmark(url, docTitle, window);
    }
  },

  select: function(window, title, text, domain, options, attributes, result) {
    function modifySelect(subject, topic) {
      if (topic == "domwindowopened") {
        ww.unregisterNotification(modifySelect);

        runOnLoad(subject, function(window) {
          let doc = window.document,
              dialog = doc.documentElement,
              cb = doc.createElement("checkbox"),
              list = $(doc, "list"),
              vbox = list.parentNode,
              extra2 = dialog.getButton("extra2"),
              width = getPref(PREF_DIALOG_WIDTH),
              rows  = getPref(PREF_DIALOG_ROWS);

          cb.setAttribute("label", _("keepOldTitle"));
          vbox.appendChild(cb);
          extra2.hidden = false;
          extra2.label = _("newBookmark");
          extra2.parentNode.querySelector("spacer").hidden = false;
          list.setAttribute("rows", rows);
          vbox.setAttribute("flex", "1");
          vbox.parentNode.setAttribute("flex", "1");

          vbox.parentNode.style.width = width + "em";

          window.sizeToContent();

          list.setAttribute("data-addon", "bmreplace");
          list.setAttribute("data-domain", domain);

          // The list is populated in another onload listener.
          window.setTimeout(function() {
            for (let i = 0, length = list.getRowCount(); i < length; ++i) {
              list.getItemAtIndex(i)
                .setAttribute("tooltiptext", attributes[i].uri);
            }
          }, 10);

          let updateChecked = function() {
            result.checked = cb.checked;
          };

          list.addEventListener("dblclick", updateChecked, false);
          dialog.addEventListener("dialogaccept", updateChecked, false);

          list.addEventListener("select", function() {
            cb.checked = attributes[list.selectedIndex].checked;
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
