/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Game = require('./game.model').Game;

exports.register = function(socket) {
  Game.on('game:save', function (doc) {
    socket.emit('game:save', doc);
  });
  Game.on('game:remove', function (doc) {
    socket.emit('game:remove', doc);
  });
  Game.on('game:create', function (doc) {
    socket.emit('game:create', doc);
  });

  Game.on('game:endGame', function(top10){
    socket.emit('game:scores', top10);
  })

};
