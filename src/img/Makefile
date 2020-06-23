FAVICONS = favicon-96.png favicon-32.png favicon-16.png

favicon-%.png:
	inkscape -z favicon.svg --export-png="$@" -w$* -h$*

favicon.ico: $(FAVICONS)
	icotool -c -o "$@" $^
	rm $^

install: favicon.ico
	mv -f "$<" "../../static/$<"

.PHONY: install
