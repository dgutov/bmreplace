TARGET = bmreplace.xpi

all: tests xpi

xpi:
	rm -f $(TARGET)
	zip -r $(TARGET) bootstrap.js install.rdf chrome.manifest options.xul content includes locale

tests:
	ruby tests.rb

.PHONY: tests
