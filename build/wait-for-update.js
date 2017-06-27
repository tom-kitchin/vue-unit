'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// helper for async assertions.
// Use like this:
//
// vm.a = 123
// waitForUpdate(() => {
//   expect(vm.$el.textContent).toBe('123')
//   vm.a = 234
// })
// .then(() => {
//   // more assertions...
// })
// .end(done)

exports.default = function (initialCb) {
  var _end = void 0;
  var queue = initialCb ? [initialCb] : [];

  function shift() {
    var job = queue.shift();
    if (queue.length) {
      var hasError = false;
      try {
        job.wait ? job(shift) : job();
      } catch (e) {
        hasError = true;
        var done = queue[queue.length - 1];
        if (done && done.fail) {
          done.fail(e); // Jasmine behaviour
        } else if (done) {
          done(e); // Mocha behaviour
        }
      }
      if (!hasError && !job.wait) {
        if (queue.length) {
          _vue2.default.nextTick(shift);
        }
      }
    } else if (job && (job.fail || job === _end)) {
      job(); // done
    }
  }

  _vue2.default.nextTick(function () {
    if (!queue.length || !_end && !queue[queue.length - 1].fail) {
      throw new Error('waitForUpdate chain is missing .end(done)');
    }
    shift();
  });

  var chainer = {
    then: function then(nextCb) {
      queue.push(nextCb);
      return chainer;
    },
    thenWaitFor: function thenWaitFor(wait) {
      if (typeof wait === 'number') {
        wait = timeout(wait);
      }
      wait.wait = true;
      queue.push(wait);
      return chainer;
    },
    end: function end(endFn) {
      queue.push(endFn);
      _end = endFn;
    }
  };

  return chainer;
}; // Borrowed from Vue.js test helpers
// See https://github.com/vuejs/vue/blob/228f0f8f3b08312d926f99b3d57757fee40e4870/test/helpers/wait-for-update.js


function timeout(n) {
  return function (next) {
    return setTimeout(next, n);
  };
}