/* global io */
'use strict';

angular.module('ticTacToeApp')
  .factory('socket', ['socketFactory', 'Game', '$rootScope',
    function (socketFactory, Game, $rootScope) {

    // socket.io now auto-configures its connection when we ommit a connection url
    var ioSocket = io('', {
      // Send auth token on connection, you will need to DI the Auth service above
      // 'query': 'token=' + Auth.getToken()
      path: '/socket.io-client'
    });

    var socket = socketFactory({
      ioSocket: ioSocket
    });

    return {

      socket: socket,

      manageGames: function (games) {
        socket.on('game:save', function (game) {
          var gameToUpdate = _.find(games, {_id: game._id});
          gameToUpdate.stateBoard = game.stateBoard;
          gameToUpdate.stateGame = game.stateGame;
          gameToUpdate.turnPlayer = game.turnPlayer;
          gameToUpdate.player1 = game.player1;
          gameToUpdate.player2 = game.player2;
          gameToUpdate.winner = game.winner;
          // Notify game update
          $rootScope.$broadcast('game:remoteUpdate', gameToUpdate);
        });
        socket.on('game:remove', function (game) {
          _.remove(games, {_id: game._id});
          if ($rootScope.currentGameId === game._id) {
            $rootScope.currentGameId = undefined;
          }
        });
        socket.on('game:create', function (game) {
          games.push(new Game(game));
          // Notify game creation
          //$rootScope.$broadcast('game:remoteCreate', _.last(games));
        });
      },

      manageScores: function (scores) {
        socket.on('game:scores', function (newScores) {
          scores.splice(0, scores.length);
          Array.prototype.push.apply(scores, newScores);
        });
      },

      removeListeners: function () {
        socket.removeAllListeners('game:save');
        socket.removeAllListeners('game:remove');
        socket.removeAllListeners('game:create');
        socket.removeAllListeners('game:scores');
      }

    };
  }]);
