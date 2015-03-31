'use strict';

var express = require('express');
var controller = require('./game.controller');
var auth = require('../../auth/auth.service');
var router = express.Router();

router.param('id',controller.loadGameById);

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/:id/:position', auth.isAuthenticated(), controller.validateAndPlayTurn);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
