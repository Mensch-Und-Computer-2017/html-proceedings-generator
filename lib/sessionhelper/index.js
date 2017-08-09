/* eslint-env node */
'use strict';

const UNSORTED_PAPER_SESSION = 'No-Session';

class SessionHelper {

  getTrackForSession(shortTitle) {
    let toc = this.toc,
      track,
      title = shortTitle.split(' ')[0];
    for (let i = 0; i < toc.length; i++) {
      if (toc[i].sessions.includes(title)) {
        track = {
          conference: toc[i].conference,
          longTitle: toc[i].longTitle,
          id: toc[i].id,
          position: toc[i].position,
          title: toc[i].title,
          sessions: toc[i].sessions
        };
      }
    }
    return track;
  }

  sortPapersInSession(sessions) {
    for (let key in sessions) {
      if (sessions.hasOwnProperty(key)) {
        sessions[key].papers = sessions[key].papers.sort(function(a, b) {
          let idPaperA = parseInt(a.positionInSession),
            idPaperB = parseInt(b.positionInSession);
          return idPaperA - idPaperB;
        });
      }
    }
    return sessions;
  }

  addPaperToSessions(sessions, paper) {
    if (paper.isAccepted === 'false') {
      return sessions;
    }
    if (paper.session.shortTitle === '') {
      paper.session.shortTitle = UNSORTED_PAPER_SESSION;
    }
    if (!sessions[paper.session.shortTitle]) {
      sessions[paper.session.shortTitle] = {
        shortTitle: paper.session.shortTitle,
        title: paper.session.title,
        papers: []
      };
    }
    sessions[paper.session.shortTitle].papers.push(paper);
    return sessions;
  }

  groupSessions(papers) {
    var sessions = {};
    for (let i = 0; i < papers.length; i++) {
      let paper = papers[i];
      sessions = this.addPaperToSessions(sessions, paper);
    }
    sessions = this.sortPapersInSession(sessions);
    return sessions;
  }

  createSessionList(papers) {
    let sessions = this.groupSessions(papers);
    return sessions;
  }

  constructor(toc) {
    this.toc = toc;
  }

  getSessionPosition(session) {
    var track = this.getTrackForSession(session.shortTitle);
    for (let i = 0; i < track.sessions.length; i++) {
      let sessionShortTitle = track.sessions[i];
      if (sessionShortTitle === session.shortTitle.split(' ')[0]) {
        return i;
      }
    }
    return -1;
  }

  sortSessionsInTrack(track) {
    var sessions = track.sessions;
    if (sessions === undefined) {
      return;
    }
    for (let i = 0; i < sessions.length; i++) {
      let sessionInTrack = sessions[i],
        position = this.getSessionPosition(sessionInTrack);
      sessionInTrack.position = position;
    }

    track.sessions = track.sessions.sort(function(a,b) {
      return a.position - b.position;
    });
  }

  extractTracks(papers) {
    let sessions = this.createSessionList(papers),
      tracks = {},
      result = [];
    for (let sessionKey in sessions) {
      if (sessions.hasOwnProperty(sessionKey)) {
        let session = sessions[sessionKey],
          track = this.getTrackForSession(sessionKey);
        if (track) {
          if (tracks[track.id] === undefined) {
            tracks[track.id] = {
              conference: track.conference,
              id: track.id,
              position: track.position,
              title: track.title,
              longTitle: track.longTitle,
              sessions: []
            };
          }

          tracks[track.id].sessions.push(session);
        }
      }
    }

    for (let track in tracks) {
      if (tracks.hasOwnProperty(track)) {
        this.sortSessionsInTrack(tracks[track]);
        result.push(tracks[track]);
      }
    }
    result = result.sort(function(a, b) {
      return a.position - b.position;
    });
    return result;
  }

}

module.exports = SessionHelper;