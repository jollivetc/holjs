'use strict';

angular.module('socketMock', [])
  .factory('socket', function () {
    return {
      socket: {
        connect: function () {
        },
        on: function () {
        },
        emit: function () {
        },
        receive: function () {
        }
      },

      manageGames: function () {
      },
      manageScores:function () {
      },
      removeListeners: function () {
      }
    };
  });
