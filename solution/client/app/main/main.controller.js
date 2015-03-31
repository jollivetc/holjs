'use strict';

angular.module('ticTacToeApp')
  .controller('MainCtrl', ['$scope', '$state', '$rootScope', 'games', 'scores', 'socket', 'Auth', 'GameState',
    function ($scope, $state, $rootScope, games, scores, socket, Auth, GameState) {

      var main = this;

      socket.manageGames(games);
      socket.manageScores(scores);

      main.scores = scores;
      main.games = games;

      $scope.GameState = GameState;

      main.stateFilter = GameState.NOT_OVER;

      main.select = function (game) {
        $state.go('main.gameboard', {idGame: game._id});
      };

      main.createGame = function () {
        $state.go('main.creategame');
      };

      main.join = function (game) {
        game.player2 = Auth.getCurrentUser().name;
        game.stateGame = GameState.PENDING;
        game.$update();
        $state.go('main.gameboard', {idGame: game._id});
      };

      main.close = function () {
        $rootScope.currentGameId = undefined;
      };

      main.remove = function (game) {
        var index;
        if (game.stateGame === GameState.OVER) {
          index = main.games.indexOf(game);
          main.games.splice(index, 1);
        } else {
          game.$remove();
        }
      };

      $scope.$on('$destroy', function () {
        socket.removeListeners();
      });

    }]);
