#!/usr/bin/env node

/* eslint-env node */
'use strict';

const fs = require('fs-extra'),
  path = require('path'),
  xml2js = require('xml2js'),
  HTMLBuilder = require('./lib/htmlbuilder'),
  SessionHelper = require('./lib/sessionhelper');

var program = require('commander'),
  sessionHelper,
  htmlBuilder;

program
  .version('0.0.1')
  .option('-i, --input [value]', 'Input file', 'submissions.xml')
  .option('-s, --snippets [value]', 'HTML snippets folder', 'html-viewer')
  .option('-t, --toc [value]', 'Table of content file', './toc-muc-2017.json')
  .option('-o, --output [value]', 'Output directory', 'out')
  .option('-p, --proceedings [value]', 'Proceedings folder', './proceedings')
  .parse(process.argv);

function log(msg) {
  console.log(msg); // eslint-disable-line
}

function buildHTMLExport(tracks) {
  let target = path.join(__dirname, program.output),
    source = path.join(__dirname, program.snippets),
    proceedings = path.join(__dirname, program.proceedings);
  log('Building html viewer in "' + program.output + '" (Using template from "' + program.snippets + '")');
  htmlBuilder.setTracks(tracks);
  htmlBuilder.setPapers(tracks.papers);
  htmlBuilder.setTarget(target);
  htmlBuilder.setSource(source);
  htmlBuilder.setPDFPath('papers');
  htmlBuilder.setProceedingsSource(proceedings);
  htmlBuilder.createHTML();
}

function augmentingTrackInformation(papers) {
  return new Promise(function(resolve) {
    log('Extracting track information from papers');
    let tracks = sessionHelper.extractTracks(papers);
    tracks.papers = papers;
    resolve(tracks);
  });
}

function filterPapers(papers) {
  return new Promise(function(resolve) {
    log('Filter papers');
    let filteredPapers = papers.filter(function(paper) {
      let hasDOI = (paper.doi !== ''),
        isAccepted = (paper.isAccepted === 'true'),
        hasFiles = (Array.isArray(paper.files.file));
      return hasDOI && isAccepted && hasFiles;
    });
    log('Filtered ' + (papers.length - filteredPapers.length) + ' papers - continue with ' + filteredPapers.length + ' papers');
    resolve(filteredPapers);
  });
}

function loadPapers(file) {
  var parser = new xml2js.Parser({ explicitArray: false });
  log('Loading data from: ' + program.input);
  return new Promise(function(resolve, reject) {
    fs.readFile(file, function(err, data) {
      if (err) {
        reject(err);
      }
      parser.parseString(data, function(err, result) {
        if (err) {
          reject(err);
        }
        log('Found ' + result.papers.paper.length + ' papers');
        resolve(result.papers.paper);
      });
    });
  });
}

function loadHelpers() {
  return new Promise(function(resolve) {
    let toc = require(program.toc);
    htmlBuilder = new HTMLBuilder();
    sessionHelper = new SessionHelper(toc);
    resolve();
  });
}

function run() {
  log('Generating html output for digital proceedings');
  loadHelpers()
    .then(loadPapers.bind(this, program.input))
    .then(filterPapers)
    .then(augmentingTrackInformation)
    .then(buildHTMLExport);
}

run();