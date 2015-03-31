'use strict';

describe('Game View', function() {
  var partieList;

  beforeEach(function() {
    browser.get('http://localhost:9000')
  });

  it('should be able to create a new Game final', function() {
    var countBefore, countAfter;
    element(by.linkText('Connexion')).click();
    element(by.model('user.email')).sendKeys('test@test.com');
    element(by.model('user.password')).sendKeys('test');
    element(by.buttonText('Connexion')).click();
    element.all(by.repeater("game in main.games")).count().then(function(data){
      countBefore = data;
      element(by.buttonText('Créer partie')).click();
      element(by.buttonText("Valider")).click();
      countAfter = element.all(by.repeater("game in main.games")).count();
      expect (countAfter).toBe(countBefore + 1);
    });
  });
});
