/*global  window */

'use strict';

angular.module('ticTacToeApp')
  .factory('gameCanvas', [function gameCanvasFactory() {

    var defOptions = {
        gameDim: {width: 3, height: 3},
        colors: {
          bg: 'transparent',
          grid: 'rgba(150, 150, 150, 1)',
          p1: 'rgba(150, 0, 0, 1)',
          p2: 'rgba(0, 150, 0, 1)',
          hoverCell: 'rgba(0, 150, 150, 0.3)',
          message: 'rgba(255, 255, 255, 0.5)',
          messagebg: 'rgba(100, 0, 0, 0.5)'
        },
        draw: {
          p1: 'cross',
          p2: 'circle'
        }
      },
      win = window,
      doc = win.document,
      reqAnim;

    // Polyfil for requestAnimationFrame
    reqAnim = (function () {

      function polyfillRequestAnimationFrame(callback, that) {
        if (callback._firstRequestAnimationFrame === undefined) {
          callback._firstRequestAnimationFrame = new Date().getTime();
        }
        setTimeout(
          function () {
            var stamp = (new Date().getTime()) - callback._firstRequestAnimationFrame;
            callback.call(that, stamp);
          },
          1000 / 60 //1000/24
        );
      }

      win.requestAnimationFrame =
        win.requestAnimationFrame ||
        win.webkitRequestAnimationFrame ||
        win.mozRequestAnimationFrame ||
        polyfillRequestAnimationFrame;

      return win.requestAnimationFrame;
    }());

    function TictactoeRenderer(options) {

      var that = this,
        container,
        canvas,
        ctx,
        gameSize,
        cellSize,
        gameDim,
        bx, bx2, // Paddings
        by, by2,
        bmi, bmi2,
        bmx, bmx2,
        cells, drawPlayer1, drawPlayer2,
        hoverCell, fnCellRequest = [],
        messages = {},
        locked = false;

      function ctor() {
        initCanvas();
      }

      function initCanvas() {

        var i;

        options = options || defOptions;

        // Get the container
        container = options.container;
        if (!(container instanceof HTMLElement)) {
          if (typeof container === 'string') {
            container = doc.getElementById(container);
          } else if (typeof container === 'object') {
            if (container.jquery) {
              container = container.get(0);
            }
          }
        }
        if (!container) {
          throw 'ARGUMENT_EXCEPTION : no container defined';
        }

        // Get the game grid size
        gameDim = {
          width: options.width || defOptions.gameDim.width,
          height: options.height || defOptions.gameDim.height
        };

        // Get the game pixel size
        gameSize = {
          width: container.clientWidth || container.innerWidth,
          height: container.clientHeight || container.innerHeight
        };

        // Cell size
        cellSize = {
          width: gameSize.width / gameDim.width,
          height: gameSize.height / gameDim.height
        };

        // Default value
        options.colors = options.colors || {};
        options.colors.bg = options.colors.bg || defOptions.colors.bg;
        options.colors.grid = options.colors.grid || defOptions.colors.grid;
        options.colors.p1 = options.colors.p1 || defOptions.colors.p1;
        options.colors.p2 = options.colors.p2 || defOptions.colors.p2;
        options.colors.hoverCell = options.colors.hoverCell || defOptions.colors.hoverCell;
        options.draw = options.draw || {};
        options.draw.p1 = options.draw.p1 || defOptions.draw.p1;
        options.draw.p2 = options.draw.p2 || defOptions.draw.p2;
        // Proportianal border size
        bx = gameSize.width / 70;
        by = gameSize.height / 70;
        bx2 = bx * 2;
        by2 = by * 2;
        bmi = Math.min(bx, by);
        bmi2 = bmi * 2;
        bmx = Math.max(bx, by);
        bmx2 = bmx * 2;

        // Create the game canvas
        canvas = doc.createElement('canvas');
        canvas.setAttribute('width', gameSize.width);
        canvas.setAttribute('height', gameSize.height);
        container.appendChild(canvas);

        // Get the context
        ctx = canvas.getContext('2d');

        // Empty cells memory grid
        cells = [];
        for (i = 0; i < gameDim.width; i += 1) {
          cells.push(new Array(gameDim.height));
        }

        // Draw forms by player
        drawPlayer1 = getDrawFunc(options.draw.p1, options.colors.p1);
        drawPlayer2 = getDrawFunc(options.draw.p2, options.colors.p2);

        // Mouse events listener
        //event.on(canvas, 'click', clickHandler);
        //event.on(canvas, 'mousemove', mouseMoveHandler);
        //event.on(canvas, 'mouseleave', mouseLeaveHandler);
        canvas.addEventListener('click', clickHandler);
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mouseleave', mouseLeaveHandler);

        // First render
        that.redraw();

      }

      function getCellByMouseEvent(e) {
        var rect = canvas.getBoundingClientRect(), px, py, x, y;
        // Pixels position
        px = e.clientX - rect.left;
        py = e.clientY - rect.top;
        if (px < 0 || py < 0 || px > gameSize.width || py > gameSize.height) {
          return undefined;
        }
        // Cell position
        x = Math.ceil(px / cellSize.width) - 1;
        y = Math.ceil(py / cellSize.height) - 1;
        return getCell(x, y);
      }

      function clickHandler(e) {
        if (locked) {
          return;
        }
        var cell = getCellByMouseEvent(e);
        if (cell !== undefined) {
          fnCellRequest.forEach(function (fn) {
            fn.call(this, cell);
          });
        }
      }

      function mouseMoveHandler(e) {
        if (locked) {
          return;
        }
        var newCell = getCellByMouseEvent(e);
        if (hoverCell === undefined || hoverCell.ix !== newCell.ix || hoverCell.iy !== newCell.iy) {
          hoverCell = newCell;
          that.redraw();
        }
      }

      function mouseLeaveHandler() {
        hoverCell = undefined;
        that.redraw();
      }

      function getCell(x, y) {
        var nex, ney, cell;
        // N-E point of the cell
        nex = x * cellSize.width + bx;
        ney = y * cellSize.height + by;
        cell = {
          index: y * gameDim.width + x,
          ix: x,
          iy: y,
          x: nex,
          y: ney,
          w: cellSize.width - bx2,
          h: cellSize.height - by2,
          state: cells[x][y]
        };
        cell.cx = cell.x + cell.w / 2;
        cell.cy = cell.y + cell.h / 2;
        return cell;
      }

      function getDrawFunc(draw, color) {
        var fn;
        switch (draw) {
        case 'cross':
          fn = drawCross;
          break;
        case 'circle':
          fn = drawCircle;
          break;
        case 'disk':
          fn = drawDisk;
          break;
        default:
          fn = drawCross;
        }
        return function (x, y) {
          fn(x, y, color);
        };
      }

      function drawCross(x, y, c) {
        var cell;
        cell = getCell(x, y);
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.moveTo(cell.x + bx, cell.y + by);
        ctx.lineTo(cell.x + cellSize.width - bx2, cell.y + cellSize.height - by2);
        ctx.stroke();
        ctx.moveTo(cell.x + cellSize.width - bx2, cell.y + by);
        ctx.lineTo(cell.x + bx, cell.y + cellSize.height - by2);
        ctx.stroke();
      }

      function drawCircle(x, y, c) {
        var cell;
        cell = getCell(x, y);
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(cell.cx, cell.cy, Math.min(cellSize.width, cellSize.height) / 2 - bmx, 0, 2 * Math.PI);
        ctx.stroke();
      }

      function drawDisk(x, y, c) {
        var cell;
        cell = getCell(x, y);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(cell.cx, cell.cy, Math.min(cellSize.width, cellSize.height) / 2 - bmx, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
      }

      function drawMessage(msgDef /*, msgIndex */) {
        var text = messages[msgDef.id] || msgDef.text, tx = bx, ty = by + 50, txtSize, fontSize;
        if (msgDef.position || undefined) {
          switch (msgDef.position) {
          case 'center':
            tx = gameSize.width / 2;
            ty = gameSize.height / 2;
            break;
          default:
            tx = msgDef.positionX || (msgDef.positionX = parseInt(msgDef.position.split(',')[0]));
            ty = msgDef.positionY || (msgDef.positionY = parseInt(msgDef.position.split(',')[1]));
          }
        }
        if (text !== undefined) {
          ctx.textAlign = 'center';
          fontSize = (msgDef.fontSize || 24);
          ctx.font = fontSize + 'px ' + msgDef.font;
          txtSize = ctx.measureText(text);
          ctx.fillStyle = msgDef.bgcolor || defOptions.colors.messagebg;
          ctx.fillRect(tx - txtSize.width / 2 - 10, ty - fontSize, txtSize.width + 20, fontSize + 10);
          ctx.fillStyle = msgDef.color || defOptions.colors.message;
          ctx.fillText(text, tx, ty);
        }
      }

      /**
       * Redraw the game
       */
      this.redraw = function () {

        var i, x, y, j;

        ctx.save();

        // Empty the canvas
        ctx.clearRect(0, 0, gameSize.width, gameSize.height);
        ctx.fillStyle = options.colors.bg;
        ctx.fillRect(0, 0, gameSize.width, gameSize.height);

        // Draw grid
        ctx.lineWidth = 3;
        ctx.strokeStyle = options.colors.grid;
        for (i = 1; i < gameDim.width; i += 1) {
          ctx.moveTo(i * cellSize.width, 5);
          ctx.lineTo(i * cellSize.width, gameSize.height - 5);
          ctx.stroke();
        }
        for (i = 1; i < gameDim.height; i += 1) {
          ctx.moveTo(5, i * cellSize.height);
          ctx.lineTo(gameSize.width - 5, i * cellSize.height);
          ctx.stroke();
        }

        // Draw player marks
        ctx.lineWidth = Math.max(bmi, 5);
        for (y = 0; y < gameDim.height; y += 1) {
          for (x = 0; x < gameDim.width; x += 1) {
            j = cells[x][y];
            if (j === 1) {
              drawPlayer1(x, y);
            }
            if (j === 2) {
              drawPlayer2(x, y);
            }
          }
        }

        // Hover cell
        if ((!locked) && hoverCell !== undefined) {
          ctx.fillStyle = options.colors.hoverCell; //options.colors.bg;
          ctx.fillRect(hoverCell.x - 3, hoverCell.y - 3, hoverCell.w + 6, hoverCell.h + 6);
        }

        // Messages
        if (options.messages) {
          options.messages.forEach(drawMessage);
        }

        ctx.restore();
      };

      that.setCell = function (x, y, j) {
        cells[x][y] = j;
        that.redraw();
      };

      that.getCell = function (x, y) {
        return getCell(x, y);
      };

      that.onCellRequest = function (fn) {
        fnCellRequest.push(fn);
      };

      that.setPlayerTurn = function (x, y, j) {
        var animeIndex = 1, animeEnd = 10, cell;
        cell = getCell(x, y);
        function animationLoop() {
          var animRatio = animeIndex / animeEnd;
          // Draw actual board
          that.redraw(); // Uniquement si animation
          // Draw scaled mark
          ctx.save();
          ctx.translate(0, cell.cy * (1 - animRatio));
          ctx.scale(1, animRatio);
          if (j === 1) {
            drawPlayer1(x, y);
          }
          if (j === 2) {
            drawPlayer2(x, y);
          }
          ctx.restore();
          // Continue animation
          animeIndex += 1;
          if (animeIndex <= animeEnd) { // < 2s
            reqAnim(animationLoop);
            //console.log(animRatio);
          } else {
            // Draw final board
            //console.log('Anim finished');
            that.setCell(x, y, j);
          }
        }

        animationLoop();
      };

      that.setMessage = function (id, value) {
        messages[id] = value;
        that.redraw();
      };

      that.clearMessages = function () {
        options.messages.forEach(function (msgDef) {
          messages[msgDef.id] = undefined;
        });
        that.redraw();
      };

      Object.defineProperty(that, 'locked', {
        set: function (nlocked) {
          locked = nlocked;
          that.redraw();
        },
        get: function () {
          return locked;
        }
      });

      that.forEachCell = function (fn) {
        var x, y, cell;
        for (x = 0; x < gameDim.width; x += 1) {
          for (y = 0; y < gameDim.height; y += 1) {
            cell = getCell(x, y);
            fn.call(that, cell, cell.index);
          }
        }
      };

      that.destroy = function () {
        canvas.removeEventListener('click', clickHandler);
        canvas.removeEventListener('mousemove', mouseMoveHandler);
        canvas.removeEventListener('mouseleave', mouseLeaveHandler);
        container.removeChild(canvas);
      };

      Object.defineProperty(that, 'options', {
        get: function () {
          return options;
        }
      });


      ctor();
    }

    return TictactoeRenderer;

  }])
  .directive('gameboard', [ '$window', 'gameCanvas', 'signPlayer1', 'signPlayer2', function ($window, GameCanvas, signPlayer1, signPlayer2) {

    // Runs during compile
    return {
      scope: {
        game: '=',
        playturn: '=',
        message: '='
      },
      restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
      controllerAs: 'vm',
      bindToController: true,
      controller: function ($scope) {
        var vm = this;
        var renderer;

        vm.canvasOptions = {};

        // Observe game options
        $scope.$watch('vm.canvasOptions', function(/*newValue, oldValue*/) {
          init();
        });

        // Observe game state
        $scope.$watch('vm.game.stateBoard', function(/*newValue, oldValue*/) {
          syncBoard();
        });

        $scope.$watch('vm.message', function (newValue /*, oldValue*/) {
          renderer.clearMessages();
          if (newValue === undefined) {
            return;
          }
          renderer.setMessage(newValue.target, newValue.message);
        });

        $scope.$on('$destroy', function destroy() {
          $window.removeEventListener('resize', onResize);
          if (renderer !== undefined) {
            renderer.destroy();
            renderer = undefined;
          }
          if (vm.canvasOptions) {
            // unref dom element
            vm.canvasOptions.container = undefined;
            vm.canvasOptions = undefined;
          }
        });

        function syncBoard() {
          var gameState = vm.game.stateBoard;
          renderer.forEachCell(
            function (cell) {
              var remoteSate;
              switch (gameState.charAt(cell.index)) {
              case signPlayer1:
                remoteSate = 1;
                break;
              case signPlayer2:
                remoteSate = 2;
                break;
              }
              if (remoteSate !== cell.state) {
                renderer.setCell(cell.ix, cell.iy, remoteSate);
              }
            }
          );
        }

        function onResize() {
          $window.removeEventListener('resize', onResize);
          if (renderer !== undefined) {
            var options = renderer.options;
            renderer.destroy();
            init(options);
          }
        }

        function init() {

          var elem = vm.canvasOptions.container;
          elem.height(elem.width());
          $window.addEventListener('resize', onResize);

          renderer = new GameCanvas(vm.canvasOptions);

          syncBoard();

          renderer.onCellRequest(function (cell) {
            vm.playturn(cell);
          });

          if (vm.message) {
            renderer.setMessage(vm.message.target, vm.message.message);
          }

        }
      },
      template: '<div class="tictactoeContainer"></div>',
      replace: true,
      link: function ($scope, elem, attrs , controllerAsVm) {

        // Set game board options
        controllerAsVm.canvasOptions = {
          container: elem,
          width: attrs.gameWidth || 3,
          height: attrs.gameHeight || 3,
          colors: {
            bg: '#F8F8F8',                            // Background color
            grid: 'rgba(0,0,150,0.7)',                // Grid line color
            p1: 'rgba(0,255,0,1)',                    // Player 1 color
            p2: 'rgba(200,0,0,1)',                    // PLayer 2 Color
            hoverCell: 'rgba(50, 50, 50, 0.3)'
          },
          draw: {p1: 'cross', p2: 'circle'},          // Players drawing forms
          messages: [                                 // Canvas message board definition
            {
              id: 'center',                           // Id used for setMessage method
              position: 'center',                     // Message position in canvas 'center' or 'x,y' in pixel units
              fontSize: 24,                           // Text font size
              font: 'Verdana',                        // Text font family
              text: undefined,                        // Initial text value (undefined if hide)
              color: 'rgba(255, 255, 255, 0.5)',      // Text color
              bgcolor: 'rgba(100, 0, 0, 0.5)'         // Text background color
            },
            {
              id: 'victory',                          // Color and font size for victory message
              position: 'center',
              fontSize: 36,
              font: 'Verdana',
              text: undefined,
              color: 'rgba(255, 255, 255, 1)',
              bgcolor: 'rgba(0,150,0,0.8)'
            },
            {
              id: 'loose',                            // Color and font size for defeat message
              position: 'center',
              fontSize: 36,
              font: 'Verdana',
              text: undefined,
              color: 'rgba(255, 255, 255, 1)',
              bgcolor: 'rgba(100,0,0,0.5)'
            }
          ]
        };
      }
    };
  }]);
