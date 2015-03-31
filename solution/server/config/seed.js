/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var User = require('../api/user/user.model');
var Game = require('../api/game/game.model').Game;

User.find({}).remove(function() {
  User.create({
    provider: 'local',
    name: 'Test',
    email: 'test@test.com',
    password: 'test'
  }, {
    provider: 'local',
    role: 'admin',
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'admin'
  }, function() {
      console.log('finished populating users');
    }
  );
});

Game.find({}).remove(function() {
  Game.create({
  	player1 : "Test",
  	player2 : "Admin",
  	turnPlayer : 1,
  	stateGame : "Over",
  	stateBoard : "X_XOOOX__",
  	winner : "Admin"
  },{
  	player1 : "Test",
  	player2 : "Admin",
  	turnPlayer : 1,
  	stateGame : "Over",
  	stateBoard : "XX_OOOX__",
  	winner : "Admin"
  },{
  	player1 : "Test",
  	player2 : "Admin",
  	turnPlayer : 1,
  	stateGame : "Over",
  	stateBoard : "XXXOO____",
  	winner : "Test"
  },{
    player1: "Test",
    player2: "Admin",
    stateGame: "Pending",
    turnPlayer: 1
  }, {
    player1: "Test",
    stateGame: "Opened"
  }, function() {
      console.log('finished populating games');
    }
  );
});
