'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('ticTacToeApp'));
  beforeEach(module('socketMock'));

  var MainCtrl,
    scope,
    injectedGames;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {

    scope = $rootScope.$new();
    injectedGames = 'foo';

    MainCtrl = $controller('MainCtrl as main', {
      $scope: scope,
      games : injectedGames,
      scores : {}
    });

  }));

  it('should attach the injected list of games to the scope', function () {
    expect(scope.main.games).toBe(injectedGames);
  });
});

describe ('Service : games', function(){
  // load the controller's module
  beforeEach(module('ticTacToeApp'));
  beforeEach(module('socketMock'));

  var $httpBackend;
  var allGames = [{
    name: 'Partie 1',
    info: 'X contre Y',
    active: true
  }, {
    name: 'Partie 2',
    info: 'X contre Z',
    active: false
  }];

  beforeEach(inject(function(_$httpBackend_){
    $httpBackend = _$httpBackend_;

    $httpBackend.expectGET('/api/games')
      .respond(allGames);
  }));

  it('should query the right api', inject(function(Game){
      var result = Game.getAll();
      $httpBackend.flush();
      expect(result.length).toEqual(allGames.length);
  }));
});
