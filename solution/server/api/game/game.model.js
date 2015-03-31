'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var GameState = {
  OVER: "Over",
  PENDING: "Pending",
  OPENED: "Opened"
};

var GameConst = {
  signEmpty: '_',
  signPlayer: {'1': 'X', '2': 'O'}
};
GameConst.emptyBoard = new Array(10).join(GameConst.signEmpty);

/**
 * Schema Game
 *
 * stateGame = Over/Pending/Opened.
 */
var GameSchema = new Schema({
  player1: String,
  player2: String,
  stateBoard: { type: String, default: GameConst.emptyBoard },
  stateGame: { type: String, default: GameState.OPENED },
  winner: String,
  turnPlayer: { type: Number, default: 1 }
});

var Game = mongoose.model('Game', GameSchema);

Game.getTop10 = function(callback){
  Game.aggregate(
      {$match:{"winner":{$exists:true}}},
      {$group:{"_id":"$winner", name:{$first:'$winner'}, score:{$sum:1}}},
      {$sort:{score : -1}},
      {$limit:10},
      function(err, summary){
        callback(err, summary);
      })
};

module.exports.Game = Game;
module.exports.GameState = GameState;
module.exports.GameConst = GameConst;
