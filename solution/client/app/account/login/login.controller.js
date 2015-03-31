'use strict';

angular.module('ticTacToeApp')
  .controller('LoginCtrl', function ($scope, Auth, $location, $window) {

    $scope.user = {};

    $scope.errors = {};

    $scope.connectTest = function () {
      $scope.user.email = 'test@test.com';
      $scope.user.password = 'test';
      $scope.login({$valid: true});
    };

    $scope.connectAdmin = function () {
      $scope.user.email = 'admin@admin.com';
      $scope.user.password = 'admin';
      $scope.login({$valid: true});
    };

    $scope.login = function (form) {
      $scope.submitted = true;

      if (form.$valid) {
        Auth.login({
          email: $scope.user.email,
          password: $scope.user.password
        })
          .then(function () {
            // Logged in, redirect to home
            $location.path('/');
          })
          .catch(function (err) {
            $scope.errors.other = err.message;
          });
      }
    };

    $scope.loginOauth = function (provider) {
      $window.location.href = '/auth/' + provider;
    };

  });
