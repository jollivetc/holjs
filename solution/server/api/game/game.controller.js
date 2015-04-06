'use strict';

var _ = require('lodash');
var Game = require('./game.model').Game;
var GameState = require('./game.model').GameState;
var ruleServiceGame = require('./game.service');

// handle the 500 reply in case of error.
function handleError(res, err) {
  return res.send(500, err);
}

//load the current game and call next middleware or return 404 if not found
exports.loadGameById = function (req, res, next, id) {
  var query = Game.findById(id);

  query.exec(function (err, game) {
    if (err) {
      return handleError(res, err);
    }
    if (!game) {
      return res.status(404).json('no game for this id');
    }
    req.game = game;
    return next();
  });
};

// Get list of games
exports.index = function (req, res) {
  Game.find()
      .where('stateGame').ne(GameState.OVER) // Only pending games
      .exec(function (err, games) {
        if (err) {
          return handleError(res, err);
        }
        return res.json(200, games);
      });
};

// Validate and play turn
exports.validateAndPlayTurn = function (req, res) {
  var position = parseInt(req.params.position);
  var userName = req.user.name;

  var callback = function (err, game) {
    if (err) {
      return res.status(400).json(err);
    }
    game.save(function (err) {
      if (err) {
        return handleError(res, err);
      }
      Game.emit('game:save', game);
      if (game.winner) {
        //emit for broadcast of new ranking in the socket
        Game.getTop10(function (err, scores) {
          Game.emit('game:endGame', scores);
        });
      }
      return res.json(200, game);
    });
  };

  ruleServiceGame.validateAndPlayTurn(req.game, position, userName, callback);
};

// Get a single game
exports.show = function (req, res) {
  return res.json(req.game);
};

// Creates a new game in the DB.
exports.create = function (req, res) {
  Game.create(req.body, function (err, game) {
    if (err) {
      return handleError(res, err);
    }
    Game.emit('game:create', game);
    return res.json(201, game);
  });
};

// Updates an existing game in the DB.
exports.update = function (req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  var updated = _.merge(req.game, req.body);
  updated.save(function (err, game) {
    if (err) {
      return handleError(res, err);
    }
    Game.emit('game:save', game);
    return res.json(200, game);
  });
};

// Deletes a game from the DB.
exports.destroy = function (req, res) {
  req.game.remove(function (err) {
    if (err) {
      return handleError(res, err);
    }
    Game.emit('game:remove', req.game);
    return res.send(204);
  });
};
