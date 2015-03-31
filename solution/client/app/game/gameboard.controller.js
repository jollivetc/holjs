'use strict';

angular.module('ticTacToeApp')
  .controller('GameboardCtrl', ['$scope', '$rootScope', '$stateParams', 'games', 'GameLogic', 'Auth',
    function ($scope, $rootScope, $stateParams, games, GameLogic, Auth) {
      var vm = this;
      $rootScope.currentGameId = $stateParams.idGame;

      // Connected user
      vm.localPlayer = angular.isDefined(Auth.getCurrentUser().name) ?
        Auth.getCurrentUser() : undefined;

      // Get game instance data from state argument (id)
      vm.activeGame = _.find(games, function (game) {
        return game._id === $stateParams.idGame;
      });

      // Game logic handler
      vm.gameLogic = new GameLogic(vm.activeGame, vm.localPlayer);

      // Play turn from directive

      vm.playTurnRequest = function (cell) {
        if (vm.localPlayer !== undefined) {
          vm.message = vm.gameLogic.playTurn(cell.index);
        }
      };

      // vm message
      vm.message = vm.gameLogic.getMessage();

      // Watch remote game updates
      var $offGameRemoteUpdate = $rootScope.$on('game:remoteUpdate', function (e, g) {
        if (g._id === vm.activeGame._id) {
          vm.message = vm.gameLogic.getMessage();
        }
      });

      $scope.$on('$destroy', function () {
        $offGameRemoteUpdate();
      });

    }]);
