'use strict';
exports.__esModule = true;
var BabelTypes = require('@babel/types');
var generator_1 = require('@babel/generator');
var traverse_1 = require('@babel/traverse');
var core_1 = require('@babel/core');
var fs = require('fs');
var convertSourceMap = require('convert-source-map');
function hash(str) {
  var i = str.length;
  var hash1 = 5381;
  var hash2 = 52711;
  while (i--) {
    var char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  return (hash1 >>> 0) * 4096 + (hash2 >>> 0);
}
/**
 * holds a map of function names as keys and array of argument indexes as values which should be automatically workletized(they have to be functions)(starting from 0)
 */
var functionArgsToWorkletize = new Map([
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['useWorkletCallback', [0]],
  // animations' callbacks
  ['withTiming', [2]],
  ['withSpring', [2]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
]);
var objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);
var globals = new Set([
  'this',
  'console',
  'performance',
  '_chronoNow',
  'Date',
  'Array',
  'ArrayBuffer',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'Date',
  'HermesInternal',
  'JSON',
  'Math',
  'Number',
  'Object',
  'String',
  'Symbol',
  'undefined',
  'null',
  'UIManager',
  'requestAnimationFrame',
  '_WORKLET',
  'arguments',
  'Boolean',
  'parseInt',
  'parseFloat',
  'Map',
  'WeakMap',
  'WeakRef',
  'Set',
  '_log',
  '_scheduleOnJS',
  '_makeShareableClone',
  '_updateDataSynchronously',
  'eval',
  '_updatePropsPaper',
  '_updatePropsFabric',
  '_removeShadowNodeFromRegistry',
  'RegExp',
  'Error',
  'ErrorUtils',
  'global',
  '_measure',
  '_scrollTo',
  '_dispatchCommand',
  '_setGestureState',
  '_getCurrentTime',
  '_eventTimestamp',
  '_frameTimestamp',
  'isNaN',
  'LayoutAnimationRepository',
  '_notifyAboutProgress',
  '_notifyAboutEnd',
]);
var gestureHandlerGestureObjects = new Set([
  // from https://github.com/software-mansion/react-native-gesture-handler/blob/new-api/src/handlers/gestures/gestureObjects.ts
  'Tap',
  'Pan',
  'Pinch',
  'Rotation',
  'Fling',
  'LongPress',
  'ForceTouch',
  'Native',
  'Manual',
  'Race',
  'Simultaneous',
  'Exclusive',
]);
var gestureHandlerBuilderMethods = new Set([
  'onBegin',
  'onStart',
  'onEnd',
  'onFinalize',
  'onUpdate',
  'onChange',
  'onTouchesDown',
  'onTouchesMove',
  'onTouchesUp',
  'onTouchesCancelled',
]);
function isRelease() {
  return (
    process.env.BABEL_ENV &&
    ['production', 'release'].includes(process.env.BABEL_ENV)
  );
}
function shouldGenerateSourceMap() {
  if (isRelease()) {
    return false;
  }
  if (process.env.REANIMATED_PLUGIN_TESTS === 'jest') {
    // We want to detect this, so we can disable source maps (because they break
    // snapshot tests with jest).
    return false;
  }
  return true;
}
function buildWorkletString(t, fun, closureVariables, name, inputMap) {
  function prependClosureVariablesIfNecessary() {
    var closureDeclaration = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern(
          closureVariables.map(function (variable) {
            return t.objectProperty(
              t.identifier(variable.name),
              t.identifier(variable.name),
              false,
              true
            );
          })
        ),
        t.memberExpression(t.thisExpression(), t.identifier('_closure'))
      ),
    ]);
    function prependClosure(path) {
      if (closureVariables.length === 0 || path.parent.type !== 'Program') {
        return;
      }
      if (!BabelTypes.isExpression(path.node.body))
        path.node.body.body.unshift(closureDeclaration);
    }
    function prependRecursiveDeclaration(path) {
      var _a;
      if (
        path.parent.type === 'Program' &&
        !BabelTypes.isArrowFunctionExpression(path.node) &&
        !BabelTypes.isObjectMethod(path.node) &&
        path.node.id &&
        path.scope.parent
      ) {
        var hasRecursiveCalls =
          ((_a = path.scope.parent.bindings[path.node.id.name]) === null ||
          _a === void 0
            ? void 0
            : _a.references) > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier(path.node.id.name),
                t.memberExpression(t.thisExpression(), t.identifier('_recur'))
              ),
            ])
          );
        }
      }
    }
    return {
      visitor: {
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
          function (path) {
            prependClosure(path);
            prependRecursiveDeclaration(path);
          },
      },
    };
  }
  var draftExpression =
    fun.program.body.find(function (obj) {
      return BabelTypes.isFunctionDeclaration(obj);
    }) ||
    fun.program.body.find(function (obj) {
      return BabelTypes.isExpressionStatement(obj);
    }) ||
    undefined;
  if (!draftExpression) throw new Error('weird draft expression bug'); // [TO DO] temporary
  var expression = BabelTypes.isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;
  if (
    !BabelTypes.isFunctionDeclaration(expression) &&
    !BabelTypes.isFunctionExpression(expression) &&
    !BabelTypes.isObjectMethod(expression)
  )
    throw new Error('weird type bug'); // [TO DO] temporary
  var workletFunction = BabelTypes.functionExpression(
    BabelTypes.identifier(name),
    expression.params,
    expression.body
  );
  var code = (0, generator_1['default'])(workletFunction).code;
  if (!inputMap) throw new Error('temporary Error'); // temporary [TO DO]
  if (shouldGenerateSourceMap()) {
    // Clear contents array (should be empty anyways)
    inputMap.sourcesContent = [];
    // Include source contents in source map, because Flipper/iframe is not
    // allowed to read files from disk.
    for (var _i = 0, _a = inputMap.sources; _i < _a.length; _i++) {
      var sourceFile = _a[_i];
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile).toString('utf-8')
      );
    }
  }
  var includeSourceMap = shouldGenerateSourceMap();
  var transformed = (0, core_1.transformSync)(code, {
    plugins: [prependClosureVariablesIfNecessary()],
    compact: !includeSourceMap,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });
  if (!transformed) throw new Error('transformed is null!\n');
  var sourceMap;
  if (includeSourceMap) {
    sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
    // sourcesContent field contains a full source code of the file which contains the worklet
    // and is not needed by the source map interpreter in order to symbolicate a stack trace.
    // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
    // in files that contain multiple worklets. Along with sourcesContent.
    delete sourceMap.sourcesContent;
  }
  return [transformed.code, JSON.stringify(sourceMap)];
}
function makeWorkletName(t, fun) {
  if (BabelTypes.isObjectMethod(fun.node)) {
    // @ts-expect-error [TO DO] how to fix it cheap?
    return fun.node.key.name;
  }
  if (BabelTypes.isFunctionDeclaration(fun.node) && fun.node.id) {
    return fun.node.id.name;
  }
  if (
    BabelTypes.isFunctionExpression(fun.node) &&
    BabelTypes.isIdentifier(fun.node.id)
  ) {
    return fun.node.id.name;
  }
  return 'anonymous'; // fallback for ArrowFunctionExpression and unnamed FunctionExpression
}
function makeWorklet(t, fun, state) {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.
  var functionName = makeWorkletName(t, fun);
  var closure = new Map();
  // remove 'worklet'; directive before generating string
  fun.traverse({
    DirectiveLiteral: function (path) {
      if (path.node.value === 'worklet' && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    },
  });
  // We use copy because some of the plugins don't update bindings and
  // some even break them
  var codeObject = (0, generator_1['default'])(fun.node, {
    sourceMaps: true,
    // //@ts-ignore [TO DO] how to type it?
    sourceFileName: state.file.opts.filename,
  });
  // We need to add a newline at the end, because there could potentially be a
  // comment after the function that gets included here, and then the closing
  // bracket would become part of the comment thus resulting in an error, since
  // there is a missing closing bracket.
  var code =
    '(' + (t.isObjectMethod(fun) ? 'function ' : '') + codeObject.code + '\n)';
  var transformed = (0, core_1.transformSync)(code, {
    // @ts-ignore [TO DO]
    filename: state.file.opts.filename,
    presets: ['@babel/preset-typescript'],
    plugins: [
      '@babel/plugin-transform-shorthand-properties',
      '@babel/plugin-transform-arrow-functions',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      ['@babel/plugin-transform-template-literals', { loose: true }],
    ],
    ast: true,
    babelrc: false,
    configFile: false,
    inputSourceMap: codeObject.map,
  });
  if (!transformed || !transformed.ast)
    throw new Error('null ast weird exception\n'); // this is temporary [TO DO]
  (0, traverse_1['default'])(transformed.ast, {
    Identifier: function (path) {
      if (!path.isReferencedIdentifier()) return;
      var name = path.node.name;
      if (
        globals.has(name) ||
        (!BabelTypes.isArrowFunctionExpression(fun.node) &&
          !BabelTypes.isObjectMethod(fun.node) &&
          fun.node.id &&
          fun.node.id.name === name)
      ) {
        return;
      }
      var parentNode = path.parent;
      if (
        parentNode.type === 'MemberExpression' &&
        parentNode.property === path.node &&
        !parentNode.computed
      ) {
        return;
      }
      if (
        parentNode.type === 'ObjectProperty' &&
        path.parentPath.parent.type === 'ObjectExpression' &&
        path.node !== parentNode.value
      ) {
        return;
      }
      var currentScope = path.scope;
      while (currentScope != null) {
        if (currentScope.bindings[name] != null) {
          return;
        }
        currentScope = currentScope.parent;
      }
      closure.set(name, path.node);
    },
  });
  var variables = Array.from(closure.values());
  var privateFunctionId = t.identifier('_f');
  var clone = t.cloneNode(fun.node);
  var funExpression = BabelTypes.isBlockStatement(clone.body)
    ? BabelTypes.functionExpression(null, clone.params, clone.body)
    : clone;
  var _a = buildWorkletString(
      t,
      transformed.ast,
      variables,
      functionName,
      transformed.map
    ),
    funString = _a[0],
    sourceMapString = _a[1];
  if (!funString) throw new Error('funString is undefined/null\n'); // this is temporary [TO DO]
  var workletHash = hash(funString);
  var location = state.file.opts.filename; // @ts-expect-error [TO DO]
  if (state.opts && state.opts.relativeSourceLocation) {
    var path = require('path');
    location = path.relative(state.cwd, location);
  }
  var lineOffset = 1;
  if (closure.size > 0) {
    // When worklet captures some variables, we append closure destructing at
    // the beginning of the function body. This effectively results in line
    // numbers shifting by the number of captured variables (size of the
    // closure) + 2 (for the opening and closing brackets of the destruct
    // statement)
    lineOffset -= closure.size + 2;
  }
  var pathForStringDefinitions = fun.parentPath.isProgram()
    ? fun
    : fun.findParent(function (path) {
        return path.parentPath.isProgram();
      });
  var initDataId =
    pathForStringDefinitions.parentPath.scope.generateUidIdentifier(
      'worklet_'.concat(workletHash, '_init_data')
    );
  var initDataObjectExpression = t.objectExpression([
    t.objectProperty(t.identifier('code'), t.stringLiteral(funString)),
    t.objectProperty(t.identifier('location'), t.stringLiteral(location)),
  ]);
  if (sourceMapString) {
    initDataObjectExpression.properties.push(
      t.objectProperty(
        t.identifier('sourceMap'),
        t.stringLiteral(sourceMapString)
      )
    );
  }
  pathForStringDefinitions.insertBefore(
    t.variableDeclaration('const', [
      t.variableDeclarator(initDataId, initDataObjectExpression),
    ])
  );
  if (
    BabelTypes.isFunctionDeclaration(funExpression) ||
    BabelTypes.isObjectMethod(funExpression)
  )
    throw new Error('fun expression bug\n'); // [TO DO] temporary
  var statements = [
    BabelTypes.variableDeclaration('const', [
      BabelTypes.variableDeclarator(privateFunctionId, funExpression),
    ]),
    BabelTypes.expressionStatement(
      BabelTypes.assignmentExpression(
        '=',
        BabelTypes.memberExpression(
          privateFunctionId,
          t.identifier('_closure'),
          false
        ),
        BabelTypes.objectExpression(
          variables.map(function (variable) {
            return BabelTypes.objectProperty(
              t.identifier(variable.name),
              variable,
              false,
              true
            );
          })
        )
      )
    ),
    BabelTypes.expressionStatement(
      BabelTypes.assignmentExpression(
        '=',
        BabelTypes.memberExpression(
          privateFunctionId,
          t.identifier('__initData'),
          false
        ),
        initDataId
      )
    ),
    BabelTypes.expressionStatement(
      BabelTypes.assignmentExpression(
        '=',
        BabelTypes.memberExpression(
          privateFunctionId,
          t.identifier('__workletHash'),
          false
        ),
        BabelTypes.numericLiteral(workletHash)
      )
    ),
  ];
  if (!isRelease()) {
    statements.unshift(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('_e'),
          t.arrayExpression([
            t.newExpression(t.identifier('Error'), []),
            t.numericLiteral(lineOffset),
            t.numericLiteral(-20), // the placement of opening bracket after Exception in line that defined '_e' variable
          ])
        ),
      ])
    );
    statements.push(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('__stackDetails'),
            false
          ),
          t.identifier('_e')
        )
      )
    );
  }
  statements.push(t.returnStatement(privateFunctionId));
  var newFun = t.functionExpression(
    // !BabelTypes.isArrowFunctionExpression(fun.node) ? fun.node.id : undefined, // [TO DO] --- this never worked
    undefined,
    [],
    t.blockStatement(statements)
  );
  return newFun;
}
function processWorkletFunction(t, fun, state) {
  // Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
  // with a workletized version of itself.
  if (!t.isFunctionParent(fun)) {
    return;
  }
  var newFun = makeWorklet(t, fun, state);
  var replacement = t.callExpression(newFun, []);
  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to define variable for the function
  var needDeclaration =
    t.isScopable(fun.parent) || t.isExportNamedDeclaration(fun.parent);
  fun.replaceWith(
    !BabelTypes.isArrowFunctionExpression(fun.node) &&
      fun.node.id &&
      needDeclaration
      ? t.variableDeclaration('const', [
          t.variableDeclarator(fun.node.id, replacement),
        ])
      : replacement
  );
}
function processWorkletObjectMethod(t, path, state) {
  // Replaces ObjectMethod with a workletized version of itself.
  if (!BabelTypes.isFunctionParent(path)) return;
  var newFun = makeWorklet(t, path, state);
  var replacement = BabelTypes.objectProperty(
    BabelTypes.identifier(
      BabelTypes.isIdentifier(path.node.key) ? path.node.key.name : ''
    ),
    t.callExpression(newFun, [])
  );
  path.replaceWith(replacement);
}
function processIfWorkletNode(t, fun, state) {
  fun.traverse({
    DirectiveLiteral: function (path) {
      var value = path.node.value;
      if (
        value === 'worklet' &&
        path.getFunctionParent() === fun &&
        BabelTypes.isBlockStatement(fun.node.body)
      ) {
        // make sure "worklet" is listed among directives for the fun
        // this is necessary as because of some bug, babel will attempt to
        // process replaced function if it is nested inside another function
        var directives = fun.node.body.directives;
        if (
          directives &&
          directives.length > 0 &&
          directives.some(function (directive) {
            return (
              t.isDirectiveLiteral(directive.value) &&
              directive.value.value === 'worklet'
            );
          })
        ) {
          processWorkletFunction(t, fun, state);
        }
      }
    },
  });
}
function processIfGestureHandlerEventCallbackFunctionNode(t, fun, state) {
  // Auto-workletizes React Native Gesture Handler callback functions.
  // Detects `Gesture.Tap().onEnd(<fun>)` or similar, but skips `something.onEnd(<fun>)`.
  // Supports method chaining as well, e.g. `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`.
  // Example #1: `Gesture.Tap().onEnd(<fun>)`
  /*
    CallExpression(
      callee: MemberExpression(
        object: CallExpression(
          callee: MemberExpression(
            object: Identifier('Gesture')
            property: Identifier('Tap')
          )
        )
        property: Identifier('onEnd')
      )
      arguments: [fun]
    )
    */
  // Example #2: `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`
  /*
    CallExpression(
      callee: MemberExpression(
        object: CallExpression(
          callee: MemberExpression(
            object: CallExpression(
              callee: MemberExpression(
                object: CallExpression(
                  callee: MemberExpression(
                    object: Identifier('Gesture')
                    property: Identifier('Tap')
                  )
                )
                property: Identifier('onStart')
              )
              arguments: [fun1]
            )
            property: Identifier('onUpdate')
          )
          arguments: [fun2]
        )
        property: Identifier('onEnd')
      )
      arguments: [fun3]
    )
    */
  if (
    t.isCallExpression(fun.parent) &&
    isGestureObjectEventCallbackMethod(t, fun.parent.callee) // [TO DO] this is temporary
  ) {
    processWorkletFunction(t, fun, state);
  }
}
function isGestureObjectEventCallbackMethod(t, node) {
  // Checks if node matches the pattern `Gesture.Foo()[*].onBar`
  // where `[*]` represents any number of method calls.
  return (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.property) &&
    gestureHandlerBuilderMethods.has(node.property.name) &&
    containsGestureObject(t, node.object)
  );
}
function containsGestureObject(t, node) {
  // Checks if node matches the pattern `Gesture.Foo()[*]`
  // where `[*]` represents any number of chained method calls, like `.something(42)`.
  // direct call
  if (isGestureObject(t, node)) {
    return true;
  }
  // method chaining
  if (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    containsGestureObject(t, node.callee.object)
  ) {
    return true;
  }
  return false;
}
function isGestureObject(t, node) {
  // Checks if node matches `Gesture.Tap()` or similar.
  /*
    node: CallExpression(
      callee: MemberExpression(
        object: Identifier('Gesture')
        property: Identifier('Tap')
      )
    )
    */
  return (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object) &&
    node.callee.object.name === 'Gesture' &&
    t.isIdentifier(node.callee.property) &&
    gestureHandlerGestureObjects.has(node.callee.property.name)
  );
}
function processWorklets(t, path, state) {
  // const callee =
  //   path.node.callee.type === 'SequenceExpression'
  //     ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
  //     : path.node.callee;
  var callee = BabelTypes.isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;
  var name = BabelTypes.isMemberExpression(callee) // @ts-expect-error [TO DO]
    ? callee.property.name // @ts-expect-error [TO DO]
    : callee.name;
  if (
    objectHooks.has(name) &&
    BabelTypes.isObjectExpression(path.get('arguments.0').node)
  ) {
    var properties = path.get('arguments.0.properties');
    for (
      var _i = 0, properties_1 = properties;
      _i < properties_1.length;
      _i++
    ) {
      var property = properties_1[_i];
      if (BabelTypes.isObjectMethod(property.node)) {
        processWorkletObjectMethod(t, property, state);
      } else {
        var value = property.get('value');
        processWorkletFunction(t, value, state); // temporarily given 3 types [TO DO]
      }
    }
  } else {
    var indexes = functionArgsToWorkletize.get(name);
    if (Array.isArray(indexes)) {
      indexes.forEach(function (index) {
        processWorkletFunction(t, path.get('arguments.'.concat(index)), state); // temporarily given 3 types [TO DO]
      });
    }
  }
}
module.exports = function (_a) {
  var t = _a.types;
  return {
    pre: function () {
      // allows adding custom globals such as host-functions
      if (this.opts != null && Array.isArray(this.opts.globals)) {
        this.opts.globals.forEach(function (name) {
          globals.add(name);
        });
      }
    },
    visitor: {
      CallExpression: {
        enter: function (path, state) {
          processWorklets(t, path, state);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter: function (path, state) {
          processIfWorkletNode(t, path, state);
          processIfGestureHandlerEventCallbackFunctionNode(t, path, state);
        },
      },
    },
  };
};
