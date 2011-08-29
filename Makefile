TARGET = bmreplace.xpi

xpi:
	rm -f $(TARGET)
	zip -r $(TARGET) bootstrap.js install.rdf content includes locale

tests:
	ruby tests.rb
