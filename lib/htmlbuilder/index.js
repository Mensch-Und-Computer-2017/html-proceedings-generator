/* eslint-env node */
'use strict';

const fs = require('fs-extra'),
  execSync = require('child_process').execSync,
  path = require('path'),
  escape = require('escape-html'),
  FIND_FILE_COMMAND = 'find {{SEARCHPATH}} -name "*{{ID}}.{{EXTENSION}}"',
  NEW_LINE_CHAR = '\n',
  AUTHOR_CONCAT_SYMBOL = ' & ',
  MAX_SEARCH_ID_LENGTH = 3,
  PATH_TO_HTML_SNIPPETS = 'html-templates',
  PATH_TO_CONTENT_FILE = 'html/content.html',
  PATH_TO_SIDEBAR_FILE = 'html/sidebar.html',
  PATH_TO_PAPER_SUBPAGES = 'html/papers',
  PATH_TO_PROCEEDINGS = 'Proceedings/',
  SESSION_MATCHING = {
    'UP-YP02': {
      shortTitle: 'UP-YP01',
      title: 'Young Professionals'
    }
  };

class HTMLBuilder {

  loadHTMLSnippetFromFile(file) {
    let snippet = fs.readFileSync(file, 'UTF-8');
    return snippet;
  }

  getFilePathForPaper(paper) {
    var searchID = paper.id.toString(),
      searchCommand = FIND_FILE_COMMAND,
      searchPath = path.join(this.target, PATH_TO_PROCEEDINGS),
      filePath;
    for (let i = searchID.length; i < MAX_SEARCH_ID_LENGTH; i++) {
      searchID = '0' + searchID;
    }
    searchCommand = searchCommand.replace('{{ID}}', searchID);
    searchCommand = searchCommand.replace('{{SEARCHPATH}}', searchPath);
    searchCommand = searchCommand.replace('{{EXTENSION}}', 'pdf');
    filePath = execSync(searchCommand).toString();
    filePath = PATH_TO_PROCEEDINGS + filePath.split(PATH_TO_PROCEEDINGS)[1];
    filePath = filePath.trim();
    return filePath;
  }

  getFilePathForVideo(paper) {

  }

  concatAuthors(authors) {
    var authorNames;
    if (!(authors instanceof Array)) {
      return authors.name;
    }
    authorNames = authors.map(function(author) {
      return author.name;
    });
    return authorNames.join(AUTHOR_CONCAT_SYMBOL);
  }

  getSessionByShortTitle(sessions, shortTitle) {
    for (let i = 0; i < sessions.length; i++) {
      let session = sessions[i];
      if (session.shortTitle === shortTitle) {
        return session;
      }
    }
    return undefined;
  }

  concatSessionsForTrack(sessions) {
    for (let i = sessions.length - 1; i >= 0; i--) {
      let session = sessions[i],
        concatData = SESSION_MATCHING[session.shortTitle];
      if (concatData) {
        let targetSession = this.getSessionByShortTitle(sessions, concatData.shortTitle);
        targetSession.papers = targetSession.papers.concat(session.papers);
        sessions.splice(i, 1);
      }
    }
    return sessions;
  }

  createPaperEntryForTOC(paper) {
    var html = this.templates.tocEntry,
      authors = this.concatAuthors(paper.authors.author);
    html = html.replace('{{ID}}', escape(paper.id));
    html = html.replace('{{TITLE}}', escape(paper.title));
    html = html.replace('{{AUTHORS}}', escape(authors));
    return html;
  }

  createSessionEntryForTOC(session) {
    let html = [];
    html.push(this.templates.tocSession.replace('{{TITLE}}', escape(session.title)));
    for (let i = 0; i < session.papers.length; i++) {
      html.push(this.createPaperEntryForTOC(session.papers[i]));
    }
    return html.join(NEW_LINE_CHAR);
  }

  createTrackEntryForTOC(key, title, sessions) {
    var html = [],
      tmpSessions = this.concatSessionsForTrack(sessions);
    html.push(this.templates.tocTrack.replace('{{TRACK_KEY}}', key).replace('{{TRACK_TITLE}}', escape(title)));
    for (let i = 0; i < tmpSessions.length; i++) {
      html.push(this.createSessionEntryForTOC(tmpSessions[i]));
    }
    return html.join(NEW_LINE_CHAR);
  }

  createTOCString(tracks) {
    var html = [],
      lastConference;
    for (let i = 0; i < tracks.length; i++) {
      let track = tracks[i];
      if (lastConference !== track.conference) {
        html.push(this.templates.tocConference.replace('{{TITLE}}', track.conference));
        lastConference = track.conference;
      }
      html.push(this.createTrackEntryForTOC(track.id, track.title, track.sessions));
    }
    return html.join(NEW_LINE_CHAR);
  }

  createLinkEntryForSidebar(track) {
    var html = this.templates.sidebarEntry;
    html = html.replace('{{KEY}}', track.id);
    html = html.replace('{{TITLE}}', track.title);
    return html;
  }

  createConferenceEntryForSidebar(key, tracks) {
    var html = [],
      tmp = this.templates.sidebar.replace('{{TITLE}}', key);
    for (let i = 0; i < tracks.length; i++) {
      let track = tracks[i];
      html.push(this.createLinkEntryForSidebar(track));
    }
    return tmp.replace('{{CONTENT}}', html.join(NEW_LINE_CHAR));
  }

  createSidebarString(tracks) {
    var html = [],
      conferences = {};
    for (let i = 0; i < tracks.length; i++) {
      let track = tracks[i];
      if (conferences[track.conference] === undefined) {
        conferences[track.conference] = [];
      }
      conferences[track.conference].push(track);
    }
    for (let key in conferences) {
      if (conferences.hasOwnProperty(key)) {
        html.push(this.createConferenceEntryForSidebar(key, conferences[key]));
      }
    }
    return html.join(NEW_LINE_CHAR);
  }

  createSubpage(targetDir, paper) {
    let fileName = 'p' + paper.id + '.html',
      filePath = path.join(targetDir, fileName),
      pdfPath = this.getFilePathForPaper(paper),
      html = this.templates.paperSubpage;
    html = html.split('{{TITLE}}').join(paper.title);
    html = html.split('{{SESSION}}').join(paper.session.title);
    html = html.split('{{AUTHORS}}').join(this.concatAuthors(paper.authors.author));
    html = html.split('{{DOI}}').join(paper.doi);
    html = html.split('{{PATH}}').join(pdfPath);
    fs.writeFileSync(filePath, html);
  }

  createSubpagesForPapers(targetDir, papers) {
    for (let i = 0; i < papers.length; i++) {
      this.createSubpage(targetDir, papers[i]);
    }
  }

  replacePlaceholderinFile(file, placeholder, content) {
    var tmp = fs.readFileSync(file, 'UTF-8');
    tmp = tmp.replace(placeholder, content);
    fs.writeFileSync(file, tmp);
  }

  setTracks(tracks) {
    this.tracks = tracks;
  }

  setPapers(papers) {
    this.papers = papers;
  }

  setTarget(dir) {
    this.target = dir;
  }

  setSource(dir) {
    this.source = dir;
  }

  setPDFPath(path) {
    this.pdfPath = path;
  }

  setProceedingsSource(dir) {
    this.proceedingsSource = dir;
  }

  loadHTMLSnippets(snippetPath) {
    var templates = {
      sidebar: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'sidebar.tmpl')),
      sidebarEntry: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'sidebar-entry.tmpl')),
      paperSubpage: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'paper-subpage.tmpl')),
      tocEntry: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-entry.tmpl')),
      tocSession: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-session.tmpl')),
      tocTrack: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-track.tmpl')),
      tocConference: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-conference.tmpl'))
    };
    return templates;
  }

  createHTML() {
    let contentFile, content, proceedingsPath, sidebarFile, sidebar, subpagePath, snippetPath;
    fs.removeSync(this.target);
    fs.copySync(this.source, this.target);
    proceedingsPath = path.join(this.target, PATH_TO_PROCEEDINGS);
    fs.copySync(this.proceedingsSource, proceedingsPath);
    snippetPath = path.join(this.target, PATH_TO_HTML_SNIPPETS);
    this.templates = this.loadHTMLSnippets(snippetPath);
    contentFile = path.join(this.target, PATH_TO_CONTENT_FILE);
    content = this.createTOCString(this.tracks);
    sidebarFile = path.join(this.target, PATH_TO_SIDEBAR_FILE);
    sidebar = this.createSidebarString(this.tracks);
    subpagePath = path.join(this.target, PATH_TO_PAPER_SUBPAGES);
    this.replacePlaceholderinFile(contentFile, '{{CONTENT}}', content);
    this.replacePlaceholderinFile(sidebarFile, '{{CONTENT}}', sidebar);
    this.createSubpagesForPapers(subpagePath, this.papers);
    fs.removeSync(snippetPath);
  }

}

module.exports = HTMLBuilder;