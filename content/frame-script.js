function getDescriptionFromDocument(doc) {
    var metaElements = doc.getElementsByTagName("META");
    for (var i = 0; i < metaElements.length; ++i) {
      if (metaElements[i].name.toLowerCase() == "description" ||
          metaElements[i].httpEquiv.toLowerCase() == "description") {
        return metaElements[i].content;
      }
    }
    return "";
  }

let doc = content.document,
    description = getDescriptionFromDocument(doc),
    data = {
      url: doc.location.toString(),
      title: doc.title,
      description: description
    };

sendAsyncMessage("bmreplace:callback", data);
