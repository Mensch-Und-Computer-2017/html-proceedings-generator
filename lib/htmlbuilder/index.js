/* eslint-env node */
'use strict';

const fs = require('fs-extra'),
  execSync = require('child_process').execSync,
  path = require('path'),
  escape = require('escape-html'),
  FIND_FILE_COMMAND = 'find {{SEARCHPATH}} -name "*{{ID}}.{{EXTENSION}}"',
  NEW_LINE_CHAR = '\n',
  AUTHOR_CONCAT_SYMBOL = ', ',
  MAX_SEARCH_ID_LENGTH = 3,
  PATH_TO_HTML_SNIPPETS = 'html-templates',
  PATH_TO_CONTENT_FILE = 'Html/content.html',
  PATH_TO_SIDEBAR_FILE = 'Html/sidebar.html',
  PATH_TO_PAPER_SUBPAGES = 'Html/papers',
  PATH_TO_PROCEEDINGS = 'Proceedings/',
  DEMO_SESSION_TITLE = 'MCI-DEMO. Demo-Session',
  DEMO_SESSION_TITLE_FOR_SUBPAGE = 'Demo-Session',
  SESSION_MATCHING = {
    'UP-YP02': {
      shortTitle: 'UP-YP01',
      title: 'Young Professionals'
    }
  },
  SESION_HEADINGS_TO_BE_REMOVED = ['MCI-DEMO. Demo-Session', 'Young Professionals', 'UX-Kompetenz von Organisationen', 'Benutzerfreundliche IT-Sicherheit: Prozessintegration und Werkzeuge (UPA Arbeitskreis Usable Security & Privacy)', 'Was ist der Mehrwert von UX und wie kann ich das zeigen? (UPA Arbeitskreis ROI UX)', 'Designing for Time Perspectives - Einführung & Workshop zur Gestaltung der zeitlichen Dimension des Erlebens', 'Von kleinen Enablern und großen Newbies - Missionen, Hürden, Erfolgsrezepte (UPA Arbeitskreis Inhouse UX Professionals)', 'Erlebnispotentialanalyse - Mit Systematik zu positiven Erlebnissen'],
  KEYNOTES = {
    'MCI-FULL': [{
      id: 'keynote-malaka',
      author: 'Rainer Malaka',
      title: 'Same Same but Different – Entertainment Computing und Mensch-Technik-Interaktion',
      file: 'Abstract_Keynote-Malaka'
    }, {
      author: 'Rachel Ilan Simpson',
      id: 'keynote-simpson',
      title: 'Designing for our next billion users',
      file: 'Abstract_Keynote-Simpson'
    }],
    'UP-FULL': [{
      id: 'keynote-krauthausen',
      author: 'Raúl Aguayo-Krauthausen',
      title: 'Disability Mainstreaming',
      file: 'Abstract_Keynote-Krauthausen'
    }]
  },
  PREFACES = {
    'MCI-FULL': {
      id: 'MCI-FULL',
      title: 'Mensch und Computer, Tagungsband',
      file: 'MCI_Vorwort',
      authors: 'Manuel Burghardt, Raphael Wimmer, Christian Wolff, Christa Womser-Hacker',
      insertBefore: true
    },
    'UP-FULL': {
      id: 'UP-FULL',
      title: 'Usabiliy Professionals, Tagungsband',
      file: 'UP_Vorwort',
      authors: 'Steffen Hess, Holger Fischer',
      insertBefore: true
    },
    'MCI-WORKSHOPS': {
      id: 'MCI-WORKSHOPS',
      title: 'Mensch und Computer, Workshopband',
      file: 'WS_Vorwort',
      authors: 'Manuel Burghardt, Raphael Wimmer, Christian Wolff, Christa Womser-Hacker',
      insertBefore: false
    }
  };

class HTMLBuilder {

  loadHTMLSnippetFromFile(file) {
    let snippet = fs.readFileSync(file, 'UTF-8');
    return snippet;
  }

  getFileByID(id, extension) {
    var filePath,
      searchID = id.toString(),
      searchPath = path.join(this.target, PATH_TO_PROCEEDINGS),
      searchCommand = FIND_FILE_COMMAND;
    for (let i = searchID.length; i < MAX_SEARCH_ID_LENGTH; i++) {
      searchID = '0' + searchID;
    }
    searchCommand = searchCommand.replace('{{ID}}', searchID);
    searchCommand = searchCommand.replace('{{SEARCHPATH}}', searchPath);
    searchCommand = searchCommand.replace('{{EXTENSION}}', extension);
    filePath = execSync(searchCommand).toString();
    if (filePath === '') {
      return undefined;
    }
    filePath = PATH_TO_PROCEEDINGS + filePath.split(PATH_TO_PROCEEDINGS)[1];
    filePath = filePath.trim();

    return filePath;

  }

  getFilePathForPaper(paper) {
    var filePath = this.getFileByID(paper.id, 'pdf');
    return filePath;
  }

  getFilePathForVideo(paper) {
    var filePath = this.getFileByID(paper.id, 'mp4');
    return filePath;
  }

  getFilePathForPreface(preface) {
    var filePath = this.getFileByID(preface.file, 'pdf');
    return filePath;
  }

  getFilePathForKeynote(keynote) {
    var filePath = this.getFileByID(keynote.file, 'pdf');
    return filePath;
  }

  explodeAuthorName(author) {
    let name = author.name.split(', ').reverse().join(' ');
    return name;
  }

  concatAuthors(authors) {
    var authorNames,
      that = this;
    if (!(authors instanceof Array)) {
      return this.explodeAuthorName(authors);
    }
    authorNames = authors.map(function(author) {
      return that.explodeAuthorName(author);
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
    if (!SESION_HEADINGS_TO_BE_REMOVED.includes(session.title)) {
      html.push(this.templates.tocSession.replace('{{TITLE}}', escape(session.title)));
    }
    for (let i = 0; i < session.papers.length; i++) {
      html.push(this.createPaperEntryForTOC(session.papers[i]));
    }
    return html.join(NEW_LINE_CHAR);
  }

  createPrefaceEntry(preface) {
    var html = this.templates.tocPreface;
    html = html.replace('{{TITLE}}', preface.title);
    html = html.replace('{{ID}}', preface.id);
    return html;
  }

  createKeynoteEntry(keynote) {
    var html = this.templates.tocKeynote;
    html = html.replace('{{AUTHOR}}', keynote.author);
    html = html.replace('{{TITLE}}', keynote.title);
    html = html.replace('{{ID}}', keynote.id);
    return html;
  }

  createTrackEntryForTOC(key, title, sessions, preface, keynotes) {
    var html = [],
      tmpSessions = this.concatSessionsForTrack(sessions);
    if (preface && preface.insertBefore === true) {
      html.push(this.createPrefaceEntry(preface));
    }
    if (keynotes) {
      for (let i = 0; i < keynotes.length; i++) {
        let keynote = keynotes[i];
        html.push(this.createKeynoteEntry(keynote));
      }
    }
    html.push(this.templates.tocTrack.replace('{{TRACK_KEY}}', key).replace('{{TRACK_TITLE}}', escape(title)));
    if (preface && preface.insertBefore === false) {
      html.push(this.createPrefaceEntry(preface));
    }
    for (let i = 0; i < tmpSessions.length; i++) {
      html.push(this.createSessionEntryForTOC(tmpSessions[i]));
    }
    return html.join(NEW_LINE_CHAR);
  }

  getPrefaceForTrack(track) {
    var preface = PREFACES[track.id];
    return preface;
  }

  getKeynotesForTrack(track) {
    var keynotes = KEYNOTES[track.id];
    return keynotes;
  }

  createTOCString(tracks) {
    var html = [],
      lastConference;
    for (let i = 0; i < tracks.length; i++) {
      let track = tracks[i],
        prefaceForTrack = this.getPrefaceForTrack(track),
        keyNotesForTrack = this.getKeynotesForTrack(track);
      if (lastConference !== track.conference) {
        html.push(this.templates.tocConference.replace('{{TITLE}}', track.longTitle).replace('{{CONFERENCE}}', track.conference));
        lastConference = track.conference;
      }
      html.push(this.createTrackEntryForTOC(track.id, track.title, track.sessions, prefaceForTrack, keyNotesForTrack));
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
      tmp = this.templates.sidebar.replace('{{TITLE}}', key).replace('{{CONFERENCE}}', key);
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
      videoPath = this.getFilePathForVideo(paper),
      pdfPath = this.getFilePathForPaper(paper),
      html = this.templates.paperSubpage,
      sessionTitle = paper.session.title;
    if (sessionTitle === DEMO_SESSION_TITLE) {
      sessionTitle = DEMO_SESSION_TITLE_FOR_SUBPAGE;
    }
    if (videoPath) {
      html = html.split('class="hidden"').join('');
      html = html.split('{{VIDEOPATH}}').join(videoPath);
    }
    html = html.split('{{TITLE}}').join(paper.title);
    html = html.split('{{SESSION}}').join(sessionTitle);
    html = html.split('{{AUTHORS}}').join(this.concatAuthors(paper.authors.author));
    html = html.split('{{DOI}}').join(paper.doi);
    html = html.split('{{PATH}}').join(pdfPath);
    fs.writeFileSync(filePath, html);
  }

  createPrefaceSubpage(targetDir, preface) {
    let fileName = 'Vorwort-' + preface.id + '.html',
      filePath = path.join(targetDir, fileName),
      pdfPath = this.getFilePathForPreface(preface),
      html = this.templates.prefaceSubpage;
    html = html.split('{{TITLE}}').join(preface.title);
    html = html.split('{{AUTHORS}}').join(preface.authors);
    html = html.split('{{PATH}}').join(pdfPath);
    fs.writeFileSync(filePath, html);
  }

  createKeynoteSubpage(targetDir, keynote) {
    let fileName = 'Keynote-' + keynote.id + '.html',
      filePath = path.join(targetDir, fileName),
      pdfPath = this.getFilePathForKeynote(keynote),
      html = this.templates.keynoteSubpage;
    html = html.split('{{TITLE}}').join(keynote.title);
    html = html.split('{{AUTHOR}}').join(keynote.author);
    html = html.split('{{PATH}}').join(pdfPath);
    fs.writeFileSync(filePath, html);
  }

  createSubpagesForPapers(targetDir, papers) {
    for (let i = 0; i < papers.length; i++) {
      this.createSubpage(targetDir, papers[i]);
    }
  }

  createSubpagesForPrefaces(targetDir, prefaces) {
    for (let key in prefaces) {
      if (prefaces.hasOwnProperty(key)) {
        this.createPrefaceSubpage(targetDir, prefaces[key]);
      }
    }
  }

  createSubpagesForKeynotes(targetDir, keynotes) {
    var allKeynotes = [];
    for (let key in keynotes) {
      if (keynotes.hasOwnProperty(key)) {
        allKeynotes = allKeynotes.concat(keynotes[key]);
      }
    }
    for (let i = 0; i < allKeynotes.length; i++) {
      this.createKeynoteSubpage(targetDir, allKeynotes[i]);
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
      prefaceSubpage: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'preface-subpage.tmpl')),
      keynoteSubpage: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'keynote-subpage.tmpl')),
      tocEntry: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-entry.tmpl')),
      tocSession: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-session.tmpl')),
      tocTrack: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-track.tmpl')),
      tocConference: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-conference.tmpl')),
      tocPreface: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-preface-entry.tmpl')),
      tocKeynote: this.loadHTMLSnippetFromFile(path.join(snippetPath, 'toc-keynote-entry.tmpl'))
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
    this.createSubpagesForPrefaces(subpagePath, PREFACES);
    this.createSubpagesForKeynotes(subpagePath, KEYNOTES);
    fs.removeSync(snippetPath);
  }

}

module.exports = HTMLBuilder;