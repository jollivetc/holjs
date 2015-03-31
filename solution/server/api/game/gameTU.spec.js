var gameService = require('./game.service.js');
var sinon = require('sinon');

describe('game management', function(){

  it('should return an error on the callback if position is already played', function(){
    var spy = sinon.spy()

    var game = {
      player1 : 'Bob',
      stateGame : 'Pending',
      stateBoard:'_____X___',
      turnPlayer: 1
    };

    gameService.validateAndPlayTurn(game, 5, 'Bob', spy);

    sinon.assert.calledWith(spy, "Impossible de jouer sur cette case. X - _____X___ - 5");
  })

});
