'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.waitForUpdate = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _waitForUpdate = require('./wait-for-update');

Object.defineProperty(exports, 'waitForUpdate', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_waitForUpdate).default;
  }
});
exports.mount = mount;
exports.shallow = shallow;
exports.shallowExcept = shallowExcept;
exports.build = build;
exports.buildShallow = buildShallow;
exports.beforeEachHooks = beforeEachHooks;
exports.afterEachHooks = afterEachHooks;
exports.simulate = simulate;
exports.fakeActions = fakeActions;
exports.fakeGetters = fakeGetters;

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var originalIgnoredElements = void 0;
var mountedInstances = [];
var actions = {};
var getters = {};

function mount(component) {
  var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var on = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var slots = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var provide = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  var store = arguments[5];
  var callback = arguments[6];

  if (arguments.length === 2 && typeof props === 'function') {
    return mount(component, {}, {}, {}, {}, undefined, props);
  }

  if (arguments.length <= 3 && isOptions(props)) {
    var cb = typeof on === 'function' ? on : undefined;
    return mount(component, props.props, props.on, props.slots, props.provide, props.store, cb);
  }

  if (!isOptions(props) && arguments.length < 6 && typeof arguments[arguments.length - 1] === 'function') {
    if (typeof on === 'function') {
      return mount(component, props, {}, {}, {}, undefined, on);
    }
    /* istanbul ignore else */
    if (typeof slots === 'function') {
      return mount(component, props, on, {}, {}, undefined, slots);
    }
    /* istanbul ignore else */
    if (typeof provide === 'function') {
      return mount(component, props, on, slots, {}, undefined, provide);
    }
    /* istanbul ignore else */
    if (typeof store === 'function') {
      return mount(component, props, on, slots, provide, undefined, store);
    }
  }

  var mountOnto = document.createElement('div');
  document.querySelector('#vue-unit').appendChild(mountOnto);

  var vueOptions = {
    render: function render(h) {
      return h(component, { props: props, on: on }, createSlots(slots, h));
    },
    provide: provide
  };

  if (store) {
    vueOptions.store = store;
  } else {
    var _store = buildFakeStore();
    if (_store) {
      vueOptions.store = _store;
    }
  }

  var vm = new _vue2.default(vueOptions);

  mountedInstances.push(vm);
  vm.$mount(mountOnto);

  // Disable direct prop mutation warnings from Vue by setting the $parent instance to null
  // See https://github.com/vuejs/vue/blob/2b67eeca4d7ae14838982b5f0163fb562ea51bdd/src/core/instance/state.js#L57-L64
  // noinspection JSAnnotator
  vm.$children[0].$parent = null;

  if (callback) callback(vm.$children[0]);

  return vm.$children[0];
}

function isOptions(object) {
  return 'props' in object || 'on' in object || 'slots' in object || 'provide' in object || 'store' in object;
}

function createSlots(slots, h) {
  if (typeof slots === 'string') {
    slots = { default: slots };
  }

  return Object.keys(slots).map(function (name) {
    var originalError = window.console.error;
    try {
      window.console.error = function () {
        throw new (Function.prototype.bind.apply(Error, [null].concat(Array.prototype.slice.call(arguments))))();
      };
      return h(_vue2.default.compile(slots[name]), { slot: name });
    } catch (error) {
      if (name !== 'default') {
        throw new Error('[VueUnit]: Error when rendering named slot "' + name + '":\n\n' + error.message);
      }
      if (!error.message.match(/Component template requires a root element, rather than just text/)) {
        throw new Error('[VueUnit]: Error when rendering default slot:\n\n' + error.message);
      }
      return _vue2.default.prototype._v(slots[name]);
    } finally {
      window.console.error = originalError;
    }
  });
}

function shallow(component) {
  var c = constructShallowComponent(component);

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return mount.apply(undefined, [c].concat(args));
}

function shallowExcept(component, exceptions) {
  var c = constructShallowComponent(component, exceptions);
  _lodash2.default.each(exceptions, function (exceptionComponent) {
    var shallowException = constructShallowComponent(exceptionComponent);
    c.components[exceptionComponent.name] = shallowException;
  });

  for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    args[_key2 - 2] = arguments[_key2];
  }

  return mount.apply(undefined, [c].concat(args));
}

function constructShallowComponent(component) {
  var exceptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  var c = _extends({}, component);
  c.components = _extends({}, component.components);
  shallowRenderComponents(c, exceptions);
  return c;
}

function shallowRenderComponents(component) {
  var exceptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  /* istanbul ignore if */
  if (!component.components) return;
  Object.keys(component.components).forEach(function (c) {
    if (_lodash2.default.find(exceptions, function (exception) {
      return exception.name === c;
    })) {
      return;
    }
    var tag = _lodash2.default.kebabCase(c);
    component.components[c] = { template: '<' + tag + '><slot></slot></' + tag + '>' };
    _vue2.default.config.ignoredElements.push(tag);
  });
}

function build(component, defaultCallback) {
  return function () {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    var lastArg = args[args.length - 1];

    if (typeof lastArg !== 'function' && typeof defaultCallback === 'function') {
      args.push(defaultCallback);
    }

    return mount.apply(undefined, [component].concat(args));
  };
}

function buildShallow(component) {
  var c = constructShallowComponent(component);

  for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    args[_key4 - 1] = arguments[_key4];
  }

  return build.apply(undefined, [c].concat(args));
}

function beforeEachHooks() {
  var div = document.createElement('div');
  div.setAttribute('id', 'vue-unit');
  document.body.appendChild(div);
  /* istanbul ignore else */
  if (_vue2.default.config.ignoredElements) {
    originalIgnoredElements = _vue2.default.config.ignoredElements.slice();
  }
}

function afterEachHooks() {
  mountedInstances.forEach(function (vm) {
    return vm.$destroy();
  });
  mountedInstances = [];
  actions = {};
  getters = {};
  var div = document.querySelector('#vue-unit');
  if (div) div.remove();
  /* istanbul ignore else */
  if (originalIgnoredElements) {
    _vue2.default.config.ignoredElements = originalIgnoredElements;
  }
}

function simulate(el, event) {
  var e = document.createEvent('HTMLEvents');
  e.initEvent(event, true, true);
  /* istanbul ignore else */
  if ('get' in el && '0' in el && el.get(0)) {
    el = el.get(0);
  }
  el.dispatchEvent(e);
}

function fakeActions(actionName, returns) {
  if ((typeof actionName === 'undefined' ? 'undefined' : _typeof(actionName)) === 'object') {
    Object.keys(actionName).forEach(function (key) {
      fakeActions(key, actionName[key]);
    });
  }
  var stub = _sinon2.default.stub();
  if (returns) stub.returns(returns);
  actions[actionName] = function (context) {
    for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
      args[_key5 - 1] = arguments[_key5];
    }

    return stub.apply(undefined, args);
  };
  return stub;
}

function fakeGetters(getterName, returns) {
  if ((typeof getterName === 'undefined' ? 'undefined' : _typeof(getterName)) === 'object') {
    Object.keys(getterName).forEach(function (key) {
      fakeGetters(key, getterName[key]);
    });
    return;
  }
  var stub = _sinon2.default.stub();
  if (returns) stub.returns(returns);
  getters[getterName] = function () {
    return stub();
  };
  return stub;
}

function buildFakeStore() {
  var Vuex = void 0;

  try {
    Vuex = require('vuex');
  } catch (e) {
    /* istanbul ignore next */
    return null;
  }

  if (!Object.keys(actions).length && !Object.keys(getters).length) {
    return null;
  }

  return new Vuex.Store({
    actions: actions,
    getters: getters
  });
}