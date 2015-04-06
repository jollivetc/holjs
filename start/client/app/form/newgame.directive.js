'use strict';

angular.module('ticTacToeApp')
  .controller('controllerNewGame', [
    '$scope',
    '$state',
    '$timeout',
    'Auth',
    'Game',
    function ($scope, $state, $timeout, Auth, Game) {

      $scope.userConnected = angular.isDefined(Auth.getCurrentUser().name);

      $scope.newGame = {
        turnPlayer: 1,
        player1: Auth.getCurrentUser().name,
        player2: ''
      };

      $scope.validateNewGame = function () {

        Game.save($scope.newGame)
            .$promise.then(function (createdGame) {
              // Wait game list update before display board
              $timeout(
                  function () {
                    $state.go('main.gameboard', {idGame: createdGame._id});
                  },
                  50
              );
            });
      };

    }])
  .directive('newGame', [function () {
    return {
      restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
      scope: {},
      controller: 'controllerNewGame',
      templateUrl: 'app/form/newgame.template.html',
      replace: true,
      link: function (/*$scope, iElm, iAttrs, controller*/) {}
    };
  }]);
