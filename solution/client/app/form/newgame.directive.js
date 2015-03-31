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

      $scope.gameCreated = false;

      $scope.gameCreatedId = undefined;

      $scope.model = { firstPlayer: true };

      $scope.newGame = {
        turnPlayer: 1,
        player1: Auth.getCurrentUser().name,
        player2: ''
      };

      $scope.validateNewGame = function () {
        //$scope.newGame.turnPlayer = $scope.model.firstPlayer ? 1 : 2;
        $scope.newGame = Game.save($scope.newGame)
          .$promise.then(function (createdGame) {
            $scope.gameCreatedId = createdGame._id;
            // Wait game list update before display board
            $timeout(
              function () {
                $state.go('main.gameboard', {idGame: $scope.gameCreatedId});
              },
              50
            );
          });
        //$scope.gameCreated = true;
      };

      $scope.display = function () {
        $state.go('main.gameboard', {idGame: $scope.newGame._id});
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
