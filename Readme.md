# Proceedings Generator

Creates a HTML website to browse through conference proceedings. 

## Install

* Download repository and run `npm install`

## Build HTML

To build the HTML Website you need:

* An XML file containing proceeding data from ConfTool. The file must be processed with [this tool](https://github.com/Mensch-Und-Computer-2017/cftool-xml-processor).
* The conference proceedings with individual pdf files for each paper

Then run `./build.sh`

# Options

| Option					| Description				| Default Value		| Allowed Values 								|
|---------------------------|---------------------------|-------------------|-----------------------------------------------|
| -V, --version         	| output the version number |					|		 										|
| -i, --input [value]   	| Input file 				| submissions.xml 	| String 										|	
| -s, --snippets		   	| HTML snippets folder | html-viewer	| String 										|	
| -t, --toc [value]  	| Table of content file		 		| ./toc-muc-2017.json 				| String										|
| -o, --output [value]  	| Output directory | out		| String										|
| -p, --proceedings [value] 	| Proceedings folder | 	./proceedings	| String										|
| -h, --help            	| output usage information  |					|												|
