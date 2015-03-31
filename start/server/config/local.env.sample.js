'use strict';

// Use local.env.js for environment variables that grunt will set when the server starts locally.
// Use for your api keys, secrets, etc. This file should not be tracked by git.
//
// You will need to set these on the server you deploy to.

module.exports = {
  DOMAIN:           'http://localhost:9000',
  SESSION_SECRET:   'tictactoe-secret',

  GOOGLE_ID:        '334871074181-r65fpjao9g9qsq1j43pnodvb05pq5r6n.apps.googleusercontent.com',
  GOOGLE_SECRET:    'mJple3-pnfqYQ9ozgSdPMF5Z',

  // Control debug level for modules using visionmedia/debug
  DEBUG: ''
};
