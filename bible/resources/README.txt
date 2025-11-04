download UTF-8 plain text KJV from https://www.gutenberg.org/ebooks/10

1.
	replace newlines not followed by another newline with spaces.
	regex to match a newline that is not followed by a newline: \n(?!\n)

2.
	replace \n\n\n with \n\n a couple times until no matches are found. This is to get these sections looking good:
	
	"
	So Joseph died, being an hundred and ten years old: and they embalmed him, and he was put in a coffin in Egypt.

	The Second Book of Moses: Called Exodus

	Now these are the names of the children of Israel, which came into Egypt; every man and his household came with Jacob.
	"

3.
	use regex to delete verse citations for readability
	regex to match a verse citation: (\b\d+:\d+\b)
	replace with: [\l]

4.
	replace the special apostraphe character with the normal UTF-8 one
	
5.
	make sure the encoding for the file is set to UTF-8




TO RUN ON STARTUP:


run main.exe on startup. To do so on Windows 11, do the following:
	press windows + R keys
	type shell:startup
	right click and create new shortcut
	browse to the location of the main executable file in this folder
	any name for the shortcut will do
	
now upon startup after shutdown or restart this program should run

The current verses are KJV