

## Introduction aux outils
Pour cet exercice nous allons utiliser une variante du code obtenu par le générateur Angular Fullstack disponible dans Yeoman.

Le générateur utilisé est disponible à l'adresse : <https://github.com/DaftMonk/generator-angular-fullstack>

Pour exécuter les tests, vous utiliserez la commande `grunt test`.
Les tests pour la partie client sont visibles à la fin du log qui défile, ceux de la partie serveur sont au milieu du log, vous devrez scroller vers le haut.

Le lancement du serveur se fait par `grunt serve`.*Attention*, un test en échec empêchera le démarrage du serveur.
 Grunt surveillant le file system, il relancera le serveur systématiquement quand vous sauvegarderer un fichier. Le template utilisant aussi le "livereload", un changement dans les fichiers de la partie client entrainera un rechargement automatique de la page du navigateur.

## Step 1 : Persistence des parties

Pour l'accès à la base de données, nous utilisons Mongoose qui permet de simplifier l'interaction avec MongoDB.

Mongoose permet de définir un mapping avec la fonction constructeur `Schema` que vous associerez à une collection dans MongoDB. Il est possible d'ajouter des fonctions pour des requêtes particulières dans le modèle ainsi obtenu.

Créez un fichier `/server/api/game/game.model.js`

```javascript
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

module.exports.Game = Game;
module.exports.GameState = GameState;
module.exports.GameConst = GameConst;
```

Vous allez commencer à utiliser ce modèle pour initialiser des données dans la base.

Dans le fichier `/server/app.js`, deux lignes permettent de faire la connexion à la base MongoDB et l'injection de quelques données (les utilisateurs).

```javascript
// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);

// Populate DB with sample data
if(config.seedDB) { require('./config/seed'); }
```
Les informations de connexion à la base sont dans le fichier `/server/config/environnement/index.js`(le config du require) qui renvoie un résultat sur la base d'un merge avec un fichier dépendant d'une variable d'environnement :
```javascript
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});
```

Le fichier d'initialisation de la base est `/server/config/seed.js` et contient déjà du code pour supprimer les users existants et en créer de nouveau.

 *Attention* ce fichier étant exécuté à chaque démarrage du serveur, les éventuelles données de vos interactions avec l'interface seront détruites.

On modifie ce fichier pour permettre la création de quelques jeux :
```javascript
var Game = require('../api/game/game.model');

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
```
*Attention* ne supprimer pas le code permettant l'injection des utilisateurs.

Pour valider que l'injection se passe bien, nous pouvons utiliser le client en ligne de commande de MongoDB. Pour cela lancer un nouveau terminal et taper `mongo`. Cette commande va permettre de se connnecter au serveur Mongo tournant sur le port par défaut.
 Ensuite vous pouvez utiliser la commande `show dbs` pour afficher la liste des bases de données existantes. 
 Ensuite vous faites `use tictactoe-dev`puis vous pouvez utiliser `show collections` pour voir la liste des collections dans cette base.
 Vous pouvez alors faire `db.games.find().pretty()` pour afficher les données d'une collection. Vous devriez alors voir la liste des parties déclarées dans le fichier `seed.js``
 Pour quitter le client Mongo, vous faites `exit`.

## Step 2 : création du controller REST pour game
Nous allons exposer via un service REST des ressources `game` qui représenteront les parties.
Pour cela nous commençons par créer un nouveau module avec un répertoire `/server/api/game`

Il faut d'abord créer un fichier `/server/api/game/index.js` qui sera chargé par défaut lors du chargement du module et permet de mapper les actions du controller ou middleware sur les verbes HTTP et les URL :

```javascript
var express = require('express');
var controller = require('./game.controller');
var auth = require('../../auth/auth.service');
var router = express.Router();

router.param('id',controller.loadGameById);

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.post('/:id/:position', auth.isAuthenticated(), controller.validateAndPlayTurn);
router.delete('/:id', controller.destroy);

module.exports = router;
```
La syntaxe `router.param(paramName, aFunction)` permet de dire que lorsque l'on utilisera une route contenant un paramètre `paramName`, il faudra passer par le middleware correspondant à la fonction.
Celui ci recevra en plus des objets requête et réponse, une fonction `next` et le paramètre. Vous pourrez alors décider de rendre immédiatement la réponse ou passer la main au middleware suivant en invoquant la fonction `next`.
 Cette syntaxe nous permet de n'avoir qu'une seule fois le code pour la recherche d'une partie et la gestion des erreurs associées (500 ou 404).

L'utilisation de `auth` permet de s'assurer que l'utilisateur est loggué et positionne ses informations dans la propriété `req.user`.
Ce service est fourni par le générateur et utilise la librairie Passport.

Puis nous créeons un fichier `game.controller.js` qui sera le controller

```javascript
var _ = require('lodash');
var Game = require('./game.model').Game;
var GameState = require('./game.model').GameState;
var ruleServiceGame = require('./game.service');

// handle the 500 reply in case of error.
function handleError(res, err) {
  return res.send(500, err);
}

//load the current game and call next middleware or return 404 if not found
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
  Game.find(function (err, games) {
    if (err) {
      return handleError(res, err);
    }
    return res.json(200, games);
  });
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
    return res.json(200, game);
  });
};

// Deletes a game from the DB.
exports.destroy = function (req, res) {
  req.game.remove(function (err) {
    if (err) {
      return handleError(res, err);
    }
    return res.send(204);
  });
};
```
Les méthodes des modèles Mongoose sont asynchrones et prennent en paramètres des fonctions callback qui recevront en argument une erreur en premier paramètre et le résultat de la requête en second paramètre.

Il reste à indiquer à Express qu'il faut utiliser ces mappings pour les urls en `api/games/`. Dans le fichier `/server/routes.js` vous ajoutez le code suivant :

```javascript
app.use('/api/games', require('./api/game'));
```
*Attention* la résolution des routes parcourent la liste et s'arrête sur la première qui correspond, vous devez ajouter ce code avant la section : 

```javascript
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

```

A noter que Express retire `/api/games/` de l'URL avant de passer le chemin au Router que vous avez déclaré.

Vous pouvez maintenant tester en utilisant CURL ou un client REST.

Comme on ne veux pas tester systématiquement à la main que les services REST sont fonctionnels, nous allons écrire des tests d'intégration. Pour cela nous utilisons `supertest`, une librairie proposant un DSL permettant d'écrire les tests.

Pour l'exécution des tests, le générateur a configurer Grunt pour considérer tout fichier respectant le pattern `xxxxxxxxx.spec.js` comme un fichier de test. Vous pouvez donc créer votre fichier sous le nom `main.controller.spec.js` 

Pour le test de la méthode GET renvoyant la liste des parties, nous obtenons le code suivant pour vérifier que la méthode nous renvoie bien un code 200 avec un body en  JSON contenant un tableau  :

```javascript
'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');


describe('GET /api/games', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('/api/games')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceof(Array);
        done();
      });
  });
});
```
Nous utilisons aussi la bibliothèque `should` qui permet d'écrire des assertions de façon plus naturelle.

Vous pouvez aussi tester votre service en appelant l'URL `http://localhost:9000/api/games` et vérifier que vous recevez bien la liste des parties que vous avez initialisé dans le fichier `/server/config/seed.js`. Vous pouvez faire un second test sur l'URL `http://localhost:9000/api/game/UN_ID` où `UN_ID` sera la valeur d'un des `_id` des games affichés précédemment.

Il est alors possible de refaire quelques tests dans un navigateur ou client REST pour vérifier que l'on écrit bien dans la base MongoDB.

## Step 3 : Affichage des parties en cours

La partie front a été généré dans le repertoire `client`. La navigation dans angularJs va être gérée par `ui-router`. Le fichier `client/index.html` est le fichier principal de la partie cliente qui intégrera le state principal.

Nous allons intégrer l'affichage de la liste des parties dans le state Main de notre page principale c'est à dire dans le template `/client/app/main/main.html` .

Pour chaque partie, nous allons afficher les noms des joueurs. A partir de chaque élément de la liste, nous allons pouvoir rejoindre en tant que joueur une partie ou accéder à la visualisation de la partie.

Le main.html va être séparé en deux sections aux responsabilités suivantes :
  -  une section gérant l'affichage de la liste des parties en cours.
  -  une autre associée à un sous-état de `main` (utilisation de la directive `ui-view`) :  permettant l'affichage de la directive `Gameboard` ou  du formulaire de création de partie.

Nous nous concentrons pour le moment sur la récupération des données `games` coté client.

Nous avons créé un service angularjs `Game` qui va récupérer les données avec NgResource dans le fichier `/client/components/game/game.service.js`.  

```javascript
.factory('Game', ['$resource', 'Auth', 'GameState', function ($resource, Auth, GameState) {

    var game;

    game = $resource(
      '/api/games/:id',
      {
        id: '@_id'
      },
      {
        update: {
          method: 'PUT'
        },
        get: {
          method: 'GET'
        },
        getAll: {
          method: 'GET',
          isArray: true
        },
        playTurn: {
          method: 'POST',
          url: '/api/games/:id/:position'
        },
        getScores: {
          method: 'GET',
          url: '/api/users/scores/10',
          isArray: true
        }
      });
    game.prototype.canJoin = function () {
      return angular.isDefined(Auth.getCurrentUser().name) &&
        this.stateGame === GameState.WAITING && this.player1 !== Auth.getCurrentUser().name;
    };

    game.prototype.canTrash = function () {
      return (this.player1 === Auth.getCurrentUser().name && this.stateGame === GameState.WAITING)|| this.stateGame === GameState.OVER;
    };

    return game;
  }])
```

Nous utilisons la méthode 'getAll' pour récupérer tous les jeux disponibles.
Afin de gérer les problématiques d'asynchronisme, nous allons appeler ce service au sein d'un attribut resolve du state `main` puisque resolve attend la résolution d'éventuelle Promise.

voici le fichier `client/app/main/main.js` :

```javascript
angular.module('ticTacToeApp')
  .config(function ($stateProvider) {
   $stateProvider.state('main', {
        url: '/',
        templateUrl: 'app/main/main.html',
          resolve: {
          games: function (Game) {
              return Game.getAll().$promise;
            }
        },
        controller: 'MainCtrl as main'
      });
     // Autres states à ajouter au $stateProvider içi plus tard dans Step 5 et Step 8
  });
```

Nous devons maintenant connecter nos données venant du back vers notre vue. Dans le controller `MainCtrl`, il faut effectuer le cablage et donner l'accès de notre liste de jeux à la vue. Les attributs venant de `resolve` peuvent être injectés dans le controller. C'est ce que nous faisons içi.

```javascript
angular.module('ticTacToeApp')
  .controller('MainCtrl', ['$scope', 'games', 'GameState',  function ($scope, games, GameState) {

      var main = this;
      main.games = games;
      
      $scope.GameState = GameState;
      main.stateFilter = GameState.NOT_OVER;
    }]);

```

Nous modifions la vue afin d'afficher notre liste de jeux dans le fichier `main.html`. On utilise ici un `ng-repeat` .  

```html
<div class="panel-body">
   <div class="list-group" ng-repeat="game in main.games | filter: {stateGame: main.stateFilter}">
      <div class="list-group-item" ng-click="main.select(game)" ng-class="{ active: game._id == currentGameId }">
      <!-- Game label -->
      <div>
          <span>{{game.player1}} vs {{game.player2}}</span>
      </div>

      </div>
    </div>
</div>

```

## Step 4 : Création d'une partie dans le back

Nous allons maintenant voir comment nous pouvons créer une partie dans le backend.

L'objet Game étant créé dans le front, nous n'avons rien de plus à faire que ce qui a été fait dans le step de création du model pour Game, qui récupère l'objet Game dans le body de la requête pour le persister.

La méthode `Game.create` fera une correspondance entre les propriétés de l'objet passé dans le body de la requête et celle déclarées dans le mapping.

## Step 5 : Création d'une partie dans le front

Nous allons ici donner la possibilité à l'utilisateur connecté de créer une nouvelle partie.

Nous allons donc ajouter un sous-état à l'état parent `main` : `main.creategame` dans `main/main.js`.

```javascript

 .state('main.creategame', {
        url: 'creategame',
        templateUrl: 'app/main/creategame.html'
      });

```

le fichier `app/main/creategame.html` fait directement référence à une directive qui va implémenter la création d'une nouvelle partie.

La directive est défini dans le repertoire `form` dans le fichier `newgame.directive.js`.

```javascript
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
```

Il restera à implementer le sous état `main.gameboard` dans lequelle on affichera le plateau de jeu.

## Step 6 : Communication via les websockets

### 6.1 : Dans le back end

Afin de pouvoir communiquer entre les différents clients, nous allons utiliser des sockets. Elles permettront de pousser vers les clients les créations / fins de parties ainsi que les coups joués par les joueurs.

Le template fourni une gestion de websockets.

Dans le fichier `/server/app.js` il y a une ligne qui fait l'import de la configuration des websockets :

```javascript
require('./config/socketio')(socketio);
```
dans ce fichier `/sever/config/socketio.js` dans la fonction `onConnect` vous ajoutez le chargement de la configuration pour notre socket

```javascript
// Insert sockets below
require('../api/game/game.socket').register(socket);
```
Pour permettre de séparer les reponsabilités, nous allons utiliser le système d'événements de NodeJS.
Les objets `Model` ont `EventEmitter` dans leur chaîne prototypale. Cela leur permet d'émettre des événements.

Dans le code du controller, `/server/api/game/game.controller.js` nous ajoutons l'émission d'événement sur les actions.

```javascript
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
```

Ensuite vous créez le fichier `/server/api/game/game.socket.js` et vous ajouter le code suivant dedans :

```javascript
var Game = require('./game.model');

exports.register = function(socket) {
  Game.on('game:save', function (doc) {
    socket.emit('game:save', doc);
  });
  Game.on('game:remove', function (doc) {
    socket.emit('game:remove', doc);
  });
  Game.on('game:create', function (doc) {
    socket.emit('game:create', doc);
  });
};
```
A partir de ce moment, un message est envoyé sur la socket lorsque nous émettons un event.

A noter que nous aurions pu utiliser des Middlewares sur le Schema qui propose des "hook" sur les post save et remove mais ceux-ci n'auraient pas permis de faire la différence entre un update et une création.

### 6.2 : Socket coté Front

Une fois les events émis coté serveur, il faut désormais les traiter coté client.

Coté client, notre stack utilise une librairie "angularifiée" de `socket.io` . Si vous désirez plus de détails voici l'url du projet : <https://github.com/btford/angular-socket-io>

Nous créons une factory qui va permettre d'initialiser une connection client socket.io et brancher nos différents messages venant du serveur.
Dans un fichier `/client/components/socket/socket.service.js` nous ajoutons le code suivant : 

```javascript
'use strict';

angular.module('ticTacToeApp')
.factory('socket', ['socketFactory', 'Game', '$rootScope',
    function (socketFactory, Game, $rootScope) {

    var ioSocket = io('', {
      path: '/socket.io-client'
    });

    var socket = socketFactory({
      ioSocket: ioSocket
    });

    return {

      socket: socket,

      manageGames: function (games) {
        socket.on('game:save', function (game) {
          var gameToUpdate = _.find(games, {_id: game._id});
          gameToUpdate.stateBoard = game.stateBoard;
          gameToUpdate.stateGame = game.stateGame;
          gameToUpdate.turnPlayer = game.turnPlayer;
          gameToUpdate.player1 = game.player1;
          gameToUpdate.player2 = game.player2;
          gameToUpdate.winner = game.winner;
          // Notify game update
          $rootScope.$broadcast('game:remoteUpdate', gameToUpdate);
        });
        socket.on('game:remove', function (game) {
          _.remove(games, {_id: game._id});
          if ($rootScope.currentGameId === game._id) {
            $rootScope.currentGameId = undefined;
          }
        });
        socket.on('game:create', function (game) {
          games.push(new Game(game));
        });
      }}
    }
]);
```

Sur l'événement 'game:save', nous cherchons le jeu modifié dans la liste des jeux puis nous appliquons les modifications à cet instance de jeu puis nous effectuons un broadcast sur le $rootscope pour avertir de la modification coté client.

Sur l'événement 'game:remove', nous supprimons le jeu reçu du serveur de la liste des jeux.

Sur l'événement 'game:create', nous créons une nouvelle ressource Game à partir du jeu reçu du serveur et l'ajoutons à la liste des jeux.


## Step 7 : Jouer un coup dans le coté serveur

### 7.1 : Ecriture la fonctionnalité

Pour jouer un coup l'application utilise l'URL `/api/game/:id/:position` définie dans le fichier `/server/api/game/index.js`.

Cette route possède un paramètre supplémentaire qui permet de rejeter l'accès si l'utilisateur n'est pas authentifié. Cet appel permet aussi l'ajout de la propriété `user`sur l'objet request.
A noter que comme l'URL est au format `/:id` les requêtes passeront aussi par le middleware param qui accroche la partie sur l'objet request.

Pour cette fonctionnalité, nous fournissons une librairie qui s'occupe de la validation si le coup est possible et du changement d'état du jeu. La fonction à invoquer prend un callback qui recevra l'éventuelle erreur ou le nouvel état du jeu.

Vous devez ajouter le code suivant dans le controller

```javascript

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
      return res.json(200, game);
    });
  };

  ruleServiceGame.validateAndplayTurn(req.game, position, userName, callback);
};
```
Nous invoquons la méthode `validateAndPlayTurn` en lui donnant le jeu, la position jouée, le nom du joueur et une fonction de callback.
  Le callback est invoqué avec une erreur si la position est déjà jouée, sinon on nous renvoie le jeu mis à jour. Nous faisons alors une sauvegarde et emettons un évènement pour que l'information soit émise via la websocket.

### 7.2 : Test unitaire sur la librairie

Nous avions écrit un test d'intégration pour les services REST en utilisant la librairie `supertest`. Pour les tests unitaires, le générateur fourni `mocha` pour l'écriture des tests et `sinon`pour l'écriture des mocks ou spies.
  Vous pouvez donc créer un fichier `/server/api/game/gameTU.spec.js` dans lequel vous mettez le code suivant permettant de vérifier que la bibliothèque renvoie une erreur si le coup n'est pas jouable :

```javascript
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
```


## Step 8 : Intégration de la directive du gameboard

Nous créons un sous-état particulier afin d'afficher le plateau de jeu et les informations associées au jeu courant.

Le sous-état `main.gameboard` est à ajouter au fichier `client/app/main/main.js`

```javascript
 .state('main.gameboard', {
   url: 'gameboard/:idGame',
   templateUrl: 'app/game/gameboard.html',
   controller: 'GameboardCtrl as vm'
 });
 
```

 La directive du plateau de jeu qui sera à inclure dans le gameboard.html est complétement fournie (voir code source de la directive dans `client/app/game/gameboard.directive.js`).

 Nous allons coder maintenant le `GameboardCtrl` et cabler la directive à notre controller de l'état. De plus, nous fournissons aussi un service `GameLogic` qui contient la logique du jeu.

 Notre controller ressemble à :

```javascript
.controller('GameboardCtrl', ['$scope', '$rootScope', '$stateParams', 'games', 'GameLogic', 'Auth',
  function ($scope, $rootScope, $stateParams, games, GameLogic, Auth) {
    var vm = this;
    $rootScope.currentGameId = $stateParams.idGame;

    // Connected user
    vm.localPlayer = angular.isDefined(Auth.getCurrentUser().name) ?
      Auth.getCurrentUser() :
      undefined;

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
```

 Nous allons donc passer les attributs suivant à notre directive qui attends trois attributs :
 * vm.activeGame : notre instance de jeu courant.
 * vm.playTurnRequest : la fonction permettant au joueur courant de jouer un coup. La directive va appeler cette fonction lorsqu'un coup sera joué.
 * vm.message : le message à afficher en fonction de l'état du jeu.

 A ce stade, si nous nous connectons en tant que l'utilisateur 'Test' nous sommes capable de jouer un coup.

## Step 9 : Protractor

Protractor est une évolution de Selenium qui est "AngularJS Aware". C'est à dire qu'il possède un ensemble de selecteur spécifique aux directives d'Angular (modèle, binding, iteration) et est capable d'attendre la stabilisation de l'application avant d'exécuter la commande suivante.
  Le générateur a créé pour nous les fichiers de configuration nécessaires avec le fichier `/protractor.conf.js`, la configuration dans le fichier `/Gruntfile.js` ainsi qu'un répertoire `/e2e`pour les tests.
  Vous créez donc un fichier `/e2e/main/newGame.spec.js`pour écrire un scénario de test sur la création d'une nouvelle partie avec le code suivant :

```javascript
'use strict';

describe('Game View', function() {
  var partieList;

  beforeEach(function() {
    browser.get('http://localhost:9000')
  });

  it('should be able to create a new Game final', function() {
    var countBefore, countAfter;
    element(by.linkText('Login')).click();
    element(by.model('user.email')).sendKeys('test@test.com');
    element(by.model('user.password')).sendKeys('test');
    element(by.buttonText('Lomein')).click();
    element.all(by.repeater("game in games")).count().then(function(data){
      countBefore = data;
      element(by.buttonText('Créer partie')).click();
      element(by.buttonText("Valider")).click();
      countAfter = element.all(by.repeater("game in games")).count();
      expect (countAfter).toBe(countBefore + 1);
    });
  });
});
```
Dans ce test, nous commençons par nous logguer dans l'application en tant qu'utilisateur "test", puis nous comptons le nombre de partie en cours. Après cela nous créons une nouvelle partie et comptons de nouveau le nombre de partie en cours et vérifions qu'il y en a une de plus.  

## Step 10 :  OAuth

Nous allons mettre en place l'authentification OAuth 2.0 via google. Si vous avez choisi Google comme fournisseur d'authentification à la génération du projet, le générateur Fullstack-Angular a créé l'habillage autour de cette authentification.

Le code généré spécifique  se trouve dans le répertoire `server/auth/google`. Comme pour l'authentification locale, la librairie `passport.js` est utilisé. La librairie `passport-google-oauth` permet de fournir une stratégie d'authentification Oauth Google.

L'initialisation se fait lors de la définition des routes du path `Auth` :

```javascript
'use strict';

var express = require('express');
var passport = require('passport');
var config = require('../config/environment');
var User = require('../api/user/user.model');

// Passport Configuration
require('./local/passport').setup(User, config);
require('./google/passport').setup(User, config);

var router = express.Router();

router.use('/local', require('./local'));
router.use('/google', require('./google'));

module.exports = router;

```

Il faut donc ajouter à l'objet `config` les paramètres Oauth google . Les paramètres d'authentification doivent être créés depuis la console développeur de Google :  <https://console.developers.google.com> .
  
  Etape à effectuer en dehors de l'atelier ( Durant l'atelier, nous pourrons vous fournir les clés générées pour l'occasion ):
      * Créer un projet dans la console
      * Aller dans le tableau de bord du projet en cliquant sur le projet créé.
      * Aller dans le menu API et Authentification puis le sous menu Identifiants.
      * Cliquer sur le bouton "Créer un identifiant client" dans la partie Oauth.
      * Choisir Type d'application Web.
      * Remplir les champs obligatoire sur l'écran suivant puis valider.
      * Choisir les urls autorisées à accéder à l'authentification et l'url de callback de votre application puis cliquer sur Créer Identifiant.
      * Vous avez maintenant toutes les informations pour effectuer une authentification OAuth depuis google.

Trois informations sont nécessaires :
* clientID: ID associé à l'application ( généré et fourni par google pour votre application )
* clientSecret: clé secrète que nous pouvons regénérer à la demande ( généré par google )
* callbackURL: l'url callback vers notre application ( à fournir à google et doit correspondre à une url de notre application )

Nous ajoutons donc ces paramètres à nos objets de configuration dans le fichier `server/config/environment/index.js`.

```javascript
.....
google: {
  clientID:    '######',
  clientSecret: '#####',
  callbackURL: 'auth/google/callback'
}
.....
```

Nous testons donc que l'authentifcation via Google fonctionne.


## Step 11 : Top10

### Modification du coté server
Pour le top 10, nous allons avoir deux modifications à faire du coté du serveur :

 - création d'un service permettant de récupérer le top 10 des joueurs lors du chargement de l'application
 - l'envoi de mise à jour du TOP 10 lorsqu'un joueur gagne une partie

La première chose à faire est la création d'une requête permettant de récupérer le top 10 des joueurs.
 Pour cela nous utilisons le pipeline aggregate de MongoDB en ajoutant une méthode dans le `Model` Mongoose en modifiant le fichier `/server/api/game/game.model.js`

```javascript
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

module.exports = Game;
```
Comme nous plaçons le nom du joueur gagnant dans la propriété `winner` du l'objet `Game`, cette requête

 - filtre les éléments dont la propriété winnner existe
 - groupe les elements en créant un comptage des elements dans la propriété score
 - trie en ordre décroissant sur la propriété score
 - récupère les 10 premiers élément
 - invoke la fonction passée en callback en donnant l'éventuelle erreur ou le résultat

Ensuite nous créons un service pour la récupération du top10.
  Pour cela on modifie le fichier `/server/api/user/index.js` pour ajouter un mapping :

```javascript
router.get('/scores/10', controller.scores);
```
Dans le fichier `/server/api/user/user.controller.js` nous ajoutons la méthode correspondante :

```javascript
var Game = require('../game/game.model');
//...
exports.scores = function(req, res) {
  Game.getTop10(function(err, scores){
    if(err){ return handleError(res, err); }
    return res.json(200, scores);})
};
```

Enfin nous devons envoyer une mise a jour en cas de victoire d'un joueur, pour cela nous modifions la méthode `validateAndPlayTurn` dans le fichier `/server/api/game/game.controller.js` pour verifier si un gagnant a été positionné sur la partie et alors requêter le top 10 et émettre un événement si nécessaire

```javascript
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
```

La dernière étape est l'envoi du nouveau classement par la websocket dans le fichier `/server/api/game/game.socket.js` :

```javascript
  Game.on('game:endGame', function(top10){
    socket.emit('game:scores', top10);
  });
```