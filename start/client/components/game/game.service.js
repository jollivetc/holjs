'use strict';

angular.module('ticTacToeApp')

  // Game constants
  .constant('signPlayer1', 'X')
  .constant('signPlayer2', 'O')
  .constant('signEmpty', '_')
  .constant('player1', '1')
  .constant('player2', '2')
  .constant('GameState', { PENDING: 'Pending', OVER: 'Over', WAITING: 'Opened', NOT_OVER: '!Over' })

  // Game ressource ajax rest access
  .factory('Game', ['$resource', 'Auth', 'GameState', function ($resource, Auth, GameState) {

    var game;

    game = $resource(
      '/api/games/:id',
      {
        id: '@_id'
      },
      {
        update: {
          method: 'PUT'
        },
        get: {
          method: 'GET'
        },
        getAll: {
          method: 'GET',
          isArray: true
        },
        playTurn: {
          method: 'POST',
          url: '/api/games/:id/:position'
        },
        getScores: {
          method: 'GET',
          url: '/api/users/scores/10',
          isArray: true
        }
      });
    game.prototype.canJoin = function () {
      return angular.isDefined(Auth.getCurrentUser().name) &&
        this.stateGame === GameState.WAITING && this.player1 !== Auth.getCurrentUser().name;
    };

    game.prototype.canTrash = function () {
      return (this.player1 === Auth.getCurrentUser().name && this.stateGame === GameState.WAITING)|| this.stateGame === GameState.OVER;
    };

    return game;
  }])

  .factory('GameLogic', [ 'Game', 'GameState', function (Game, GameState) {

    function GameLogic(gameData, player) {

      var that = this, numberPlayer;

      function ctor() {
        if (player !== undefined) {
          numberPlayer = that.identifyPlayer(player.name);
        }
      }

      Object.defineProperty(that, 'player', {
        set: function (pl) {
          player = pl;
          numberPlayer = that.identifyPlayer(player.name);
        },
        get: function () { return player; }
      });

      that.playTurn = function playTurn(position) {
        // I can play
        if (that.isBlocked) {
          return that.getMessage();
        }
        Game.playTurn({position: position}, gameData);
        return that.getMessage();
      };

      Object.defineProperty(that, 'isBlocked', {
        get: function () {
          return !(numberPlayer === gameData.turnPlayer && gameData.stateGame === GameState.PENDING);
        }
      });

      that.identifyPlayer = function identifyPlayer(name) {
        var numberUser = 0;
        if (gameData.player1 === name) {
          numberUser = 1;
        } else {
          if (gameData.player2 === name) {
            numberUser = 2;
          }
        }
        return numberUser;
      };

      that.getMessage = function () {
        var msg, target = 'center';
        if (gameData.stateGame === GameState.OVER) {
          if (player !== undefined && player.name === gameData.winner) {
            target = 'victory';
            msg = 'Vous avez gagné !';
          } else {
            if (gameData.winner !== undefined && gameData.winner !== player.name) {
              target = 'loose';
              msg = 'Vous avez perdu !';
            } else {
              target = 'victory';
              msg = 'Match nul !';
            }
          }
        } else if (gameData.stateGame === GameState.WAITING) {
          msg = 'En attente d\'un adversaire';
        } else if (numberPlayer !== gameData.turnPlayer) {
          msg = 'Attente du coup de votre adversaire !';
        }
        if (msg !== undefined) {
          return {
            message: msg,
            target: target
          };
        }
        return undefined;
      };

      ctor();
    }

    return GameLogic;

  }]);
