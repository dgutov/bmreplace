Components.utils.import("resource://app/modules/PlacesUIUtils.jsm");

let doc = content.document,
    description = PlacesUIUtils.getDescriptionFromDocument(doc),
    data = {
      url: doc.location.toString(),
      title: doc.title,
      description: description
    };

sendAsyncMessage("bmreplace:callback", data);
