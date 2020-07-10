/*!
 * QUnit 2.9.2
 * https://qunitjs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2019-02-21T22:49Z
 */
(function (global$1) {
  'use strict';

  global$1 = global$1 && global$1.hasOwnProperty('default') ? global$1['default'] : global$1;

  var window$1 = global$1.window;
  var self$1 = global$1.self;
  var console = global$1.console;
  var setTimeout$1 = global$1.setTimeout;
  var clearTimeout = global$1.clearTimeout;

  var document$1 = window$1 && window$1.document;
  var navigator = window$1 && window$1.navigator;

  var localSessionStorage = function () {
  	var x = "qunit-test-string";
  	try {
  		global$1.sessionStorage.setItem(x, x);
  		global$1.sessionStorage.removeItem(x);
  		return global$1.sessionStorage;
  	} catch (e) {
  		return undefined;
  	}
  }();

  /**
   * Returns a function that proxies to the given method name on the globals
   * console object. The proxy will also detect if the console doesn't exist and
   * will appropriately no-op. This allows support for IE9, which doesn't have a
   * console if the developer tools are not open.
   */
  function consoleProxy(method) {
  	return function () {
  		if (console) {
  			console[method].apply(console, arguments);
  		}
  	};
  }

  var Logger = {
  	warn: consoleProxy("warn")
  };

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };











  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();









































  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  var toString = Object.prototype.toString;
  var hasOwn = Object.prototype.hasOwnProperty;
  var now = Date.now || function () {
  	return new Date().getTime();
  };

  var hasPerformanceApi = detectPerformanceApi();
  var performance = hasPerformanceApi ? window$1.performance : undefined;
  var performanceNow = hasPerformanceApi ? performance.now.bind(performance) : now;

  function detectPerformanceApi() {
  	return window$1 && typeof window$1.performance !== "undefined" && typeof window$1.performance.mark === "function" && typeof window$1.performance.measure === "function";
  }

  function measure(comment, startMark, endMark) {

  	// `performance.measure` may fail if the mark could not be found.
  	// reasons a specific mark could not be found include: outside code invoking `performance.clearMarks()`
  	try {
  		performance.measure(comment, startMark, endMark);
  	} catch (ex) {
  		Logger.warn("performance.measure could not be executed because of ", ex.message);
  	}
  }

  var defined = {
  	document: window$1 && window$1.document !== undefined,
  	setTimeout: setTimeout$1 !== undefined
  };

  // Returns a new Array with the elements that are in a but not in b
  function diff(a, b) {
  	var i,
  	    j,
  	    result = a.slice();

  	for (i = 0; i < result.length; i++) {
  		for (j = 0; j < b.length; j++) {
  			if (result[i] === b[j]) {
  				result.splice(i, 1);
  				i--;
  				break;
  			}
  		}
  	}
  	return result;
  }

  /**
   * Determines whether an element exists in a given array or not.
   *
   * @method inArray
   * @param {Any} elem
   * @param {Array} array
   * @return {Boolean}
   */
  function inArray(elem, array) {
  	return array.indexOf(elem) !== -1;
  }

  /**
   * Makes a clone of an object using only Array or Object as base,
   * and copies over the own enumerable properties.
   *
   * @param {Object} obj
   * @return {Object} New object with only the own properties (recursively).
   */
  function objectValues(obj) {
  	var key,
  	    val,
  	    vals = is("array", obj) ? [] : {};
  	for (key in obj) {
  		if (hasOwn.call(obj, key)) {
  			val = obj[key];
  			vals[key] = val === Object(val) ? objectValues(val) : val;
  		}
  	}
  	return vals;
  }

  function extend(a, b, undefOnly) {
  	for (var prop in b) {
  		if (hasOwn.call(b, prop)) {
  			if (b[prop] === undefined) {
  				delete a[prop];
  			} else if (!(undefOnly && typeof a[prop] !== "undefined")) {
  				a[prop] = b[prop];
  			}
  		}
  	}

  	return a;
  }

  function objectType(obj) {
  	if (typeof obj === "undefined") {
  		return "undefined";
  	}

  	// Consider: typeof null === object
  	if (obj === null) {
  		return "null";
  	}

  	var match = toString.call(obj).match(/^\[object\s(.*)\]$/),
  	    type = match && match[1];

  	switch (type) {
  		case "Number":
  			if (isNaN(obj)) {
  				return "nan";
  			}
  			return "number";
  		case "String":
  		case "Boolean":
  		case "Array":
  		case "Set":
  		case "Map":
  		case "Date":
  		case "RegExp":
  		case "Function":
  		case "Symbol":
  			return type.toLowerCase();
  		default:
  			return typeof obj === "undefined" ? "undefined" : _typeof(obj);
  	}
  }

  // Safe object type checking
  function is(type, obj) {
  	return objectType(obj) === type;
  }

  // Based on Java's String.hashCode, a simple but not
  // rigorously collision resistant hashing function
  function generateHash(module, testName) {
  	var str = module + "\x1C" + testName;
  	var hash = 0;

  	for (var i = 0; i < str.length; i++) {
  		hash = (hash << 5) - hash + str.charCodeAt(i);
  		hash |= 0;
  	}

  	// Convert the possibly negative integer hash code into an 8 character hex string, which isn't
  	// strictly necessary but increases user understanding that the id is a SHA-like hash
  	var hex = (0x100000000 + hash).toString(16);
  	if (hex.length < 8) {
  		hex = "0000000" + hex;
  	}

  	return hex.slice(-8);
  }

  // Test for equality any JavaScript type.
  // Authors: Philippe Rathé <prathe@gmail.com>, David Chan <david@troi.org>
  var equiv = (function () {

  	// Value pairs queued for comparison. Used for breadth-first processing order, recursion
  	// detection and avoiding repeated comparison (see below for details).
  	// Elements are { a: val, b: val }.
  	var pairs = [];

  	var getProto = Object.getPrototypeOf || function (obj) {
  		return obj.__proto__;
  	};

  	function useStrictEquality(a, b) {

  		// This only gets called if a and b are not strict equal, and is used to compare on
  		// the primitive values inside object wrappers. For example:
  		// `var i = 1;`
  		// `var j = new Number(1);`
  		// Neither a nor b can be null, as a !== b and they have the same type.
  		if ((typeof a === "undefined" ? "undefined" : _typeof(a)) === "object") {
  			a = a.valueOf();
  		}
  		if ((typeof b === "undefined" ? "undefined" : _typeof(b)) === "object") {
  			b = b.valueOf();
  		}

  		return a === b;
  	}

  	function compareConstructors(a, b) {
  		var protoA = getProto(a);
  		var protoB = getProto(b);

  		// Comparing constructors is more strict than using `instanceof`
  		if (a.constructor === b.constructor) {
  			return true;
  		}

  		// Ref #851
  		// If the obj prototype descends from a null constructor, treat it
  		// as a null prototype.
  		if (protoA && protoA.constructor === null) {
  			protoA = null;
  		}
  		if (protoB && protoB.constructor === null) {
  			protoB = null;
  		}

  		// Allow objects with no prototype to be equivalent to
  		// objects with Object as their constructor.
  		if (protoA === null && protoB === Object.prototype || protoB === null && protoA === Object.prototype) {
  			return true;
  		}

  		return false;
  	}

  	function getRegExpFlags(regexp) {
  		return "flags" in regexp ? regexp.flags : regexp.toString().match(/[gimuy]*$/)[0];
  	}

  	function isContainer(val) {
  		return ["object", "array", "map", "set"].indexOf(objectType(val)) !== -1;
  	}

  	function breadthFirstCompareChild(a, b) {

  		// If a is a container not reference-equal to b, postpone the comparison to the
  		// end of the pairs queue -- unless (a, b) has been seen before, in which case skip
  		// over the pair.
  		if (a === b) {
  			return true;
  		}
  		if (!isContainer(a)) {
  			return typeEquiv(a, b);
  		}
  		if (pairs.every(function (pair) {
  			return pair.a !== a || pair.b !== b;
  		})) {

  			// Not yet started comparing this pair
  			pairs.push({ a: a, b: b });
  		}
  		return true;
  	}

  	var callbacks = {
  		"string": useStrictEquality,
  		"boolean": useStrictEquality,
  		"number": useStrictEquality,
  		"null": useStrictEquality,
  		"undefined": useStrictEquality,
  		"symbol": useStrictEquality,
  		"date": useStrictEquality,

  		"nan": function nan() {
  			return true;
  		},

  		"regexp": function regexp(a, b) {
  			return a.source === b.source &&

  			// Include flags in the comparison
  			getRegExpFlags(a) === getRegExpFlags(b);
  		},

  		// abort (identical references / instance methods were skipped earlier)
  		"function": function _function() {
  			return false;
  		},

  		"array": function array(a, b) {
  			var i, len;

  			len = a.length;
  			if (len !== b.length) {

  				// Safe and faster
  				return false;
  			}

  			for (i = 0; i < len; i++) {

  				// Compare non-containers; queue non-reference-equal containers
  				if (!breadthFirstCompareChild(a[i], b[i])) {
  					return false;
  				}
  			}
  			return true;
  		},

  		// Define sets a and b to be equivalent if for each element aVal in a, there
  		// is some element bVal in b such that aVal and bVal are equivalent. Element
  		// repetitions are not counted, so these are equivalent:
  		// a = new Set( [ {}, [], [] ] );
  		// b = new Set( [ {}, {}, [] ] );
  		"set": function set$$1(a, b) {
  			var innerEq,
  			    outerEq = true;

  			if (a.size !== b.size) {

  				// This optimization has certain quirks because of the lack of
  				// repetition counting. For instance, adding the same
  				// (reference-identical) element to two equivalent sets can
  				// make them non-equivalent.
  				return false;
  			}

  			a.forEach(function (aVal) {

  				// Short-circuit if the result is already known. (Using for...of
  				// with a break clause would be cleaner here, but it would cause
  				// a syntax error on older Javascript implementations even if
  				// Set is unused)
  				if (!outerEq) {
  					return;
  				}

  				innerEq = false;

  				b.forEach(function (bVal) {
  					var parentPairs;

  					// Likewise, short-circuit if the result is already known
  					if (innerEq) {
  						return;
  					}

  					// Swap out the global pairs list, as the nested call to
  					// innerEquiv will clobber its contents
  					parentPairs = pairs;
  					if (innerEquiv(bVal, aVal)) {
  						innerEq = true;
  					}

  					// Replace the global pairs list
  					pairs = parentPairs;
  				});

  				if (!innerEq) {
  					outerEq = false;
  				}
  			});

  			return outerEq;
  		},

  		// Define maps a and b to be equivalent if for each key-value pair (aKey, aVal)
  		// in a, there is some key-value pair (bKey, bVal) in b such that
  		// [ aKey, aVal ] and [ bKey, bVal ] are equivalent. Key repetitions are not
  		// counted, so these are equivalent:
  		// a = new Map( [ [ {}, 1 ], [ {}, 1 ], [ [], 1 ] ] );
  		// b = new Map( [ [ {}, 1 ], [ [], 1 ], [ [], 1 ] ] );
  		"map": function map(a, b) {
  			var innerEq,
  			    outerEq = true;

  			if (a.size !== b.size) {

  				// This optimization has certain quirks because of the lack of
  				// repetition counting. For instance, adding the same
  				// (reference-identical) key-value pair to two equivalent maps
  				// can make them non-equivalent.
  				return false;
  			}

  			a.forEach(function (aVal, aKey) {

  				// Short-circuit if the result is already known. (Using for...of
  				// with a break clause would be cleaner here, but it would cause
  				// a syntax error on older Javascript implementations even if
  				// Map is unused)
  				if (!outerEq) {
  					return;
  				}

  				innerEq = false;

  				b.forEach(function (bVal, bKey) {
  					var parentPairs;

  					// Likewise, short-circuit if the result is already known
  					if (innerEq) {
  						return;
  					}

  					// Swap out the global pairs list, as the nested call to
  					// innerEquiv will clobber its contents
  					parentPairs = pairs;
  					if (innerEquiv([bVal, bKey], [aVal, aKey])) {
  						innerEq = true;
  					}

  					// Replace the global pairs list
  					pairs = parentPairs;
  				});

  				if (!innerEq) {
  					outerEq = false;
  				}
  			});

  			return outerEq;
  		},

  		"object": function object(a, b) {
  			var i,
  			    aProperties = [],
  			    bProperties = [];

  			if (compareConstructors(a, b) === false) {
  				return false;
  			}

  			// Be strict: don't ensure hasOwnProperty and go deep
  			for (i in a) {

  				// Collect a's properties
  				aProperties.push(i);

  				// Skip OOP methods that look the same
  				if (a.constructor !== Object && typeof a.constructor !== "undefined" && typeof a[i] === "function" && typeof b[i] === "function" && a[i].toString() === b[i].toString()) {
  					continue;
  				}

  				// Compare non-containers; queue non-reference-equal containers
  				if (!breadthFirstCompareChild(a[i], b[i])) {
  					return false;
  				}
  			}

  			for (i in b) {

  				// Collect b's properties
  				bProperties.push(i);
  			}

  			// Ensures identical properties name
  			return typeEquiv(aProperties.sort(), bProperties.sort());
  		}
  	};

  	function typeEquiv(a, b) {
  		var type = objectType(a);

  		// Callbacks for containers will append to the pairs queue to achieve breadth-first
  		// search order. The pairs queue is also used to avoid reprocessing any pair of
  		// containers that are reference-equal to a previously visited pair (a special case
  		// this being recursion detection).
  		//
  		// Because of this approach, once typeEquiv returns a false value, it should not be
  		// called again without clearing the pair queue else it may wrongly report a visited
  		// pair as being equivalent.
  		return objectType(b) === type && callbacks[type](a, b);
  	}

  	function innerEquiv(a, b) {
  		var i, pair;

  		// We're done when there's nothing more to compare
  		if (arguments.length < 2) {
  			return true;
  		}

  		// Clear the global pair queue and add the top-level values being compared
  		pairs = [{ a: a, b: b }];

  		for (i = 0; i < pairs.length; i++) {
  			pair = pairs[i];

  			// Perform type-specific comparison on any pairs that are not strictly
  			// equal. For container types, that comparison will postpone comparison
  			// of any sub-container pair to the end of the pair queue. This gives
  			// breadth-first search order. It also avoids the reprocessing of
  			// reference-equal siblings, cousins etc, which can have a significant speed
  			// impact when comparing a container of small objects each of which has a
  			// reference to the same (singleton) large object.
  			if (pair.a !== pair.b && !typeEquiv(pair.a, pair.b)) {
  				return false;
  			}
  		}

  		// ...across all consecutive argument pairs
  		return arguments.length === 2 || innerEquiv.apply(this, [].slice.call(arguments, 1));
  	}

  	return function () {
  		var result = innerEquiv.apply(undefined, arguments);

  		// Release any retained objects
  		pairs.length = 0;
  		return result;
  	};
  })();

  /**
   * Config object: Maintain internal state
   * Later exposed as QUnit.config
   * `config` initialized at top of scope
   */
  var config = {

  	// The queue of tests to run
  	queue: [],

  	// Block until document ready
  	blocking: true,

  	// By default, run previously failed tests first
  	// very useful in combination with "Hide passed tests" checked
  	reorder: true,

  	// By default, modify document.title when suite is done
  	altertitle: true,

  	// HTML Reporter: collapse every test except the first failing test
  	// If false, all failing tests will be expanded
  	collapse: true,

  	// By default, scroll to top of the page when suite is done
  	scrolltop: true,

  	// Depth up-to which object will be dumped
  	maxDepth: 5,

  	// When enabled, all tests must call expect()
  	requireExpects: false,

  	// Placeholder for user-configurable form-exposed URL parameters
  	urlConfig: [],

  	// Set of all modules.
  	modules: [],

  	// The first unnamed module
  	currentModule: {
  		name: "",
  		tests: [],
  		childModules: [],
  		testsRun: 0,
  		unskippedTestsRun: 0,
  		hooks: {
  			before: [],
  			beforeEach: [],
  			afterEach: [],
  			after: []
  		}
  	},

  	callbacks: {},

  	// The storage module to use for reordering tests
  	storage: localSessionStorage
  };

  // take a predefined QUnit.config and extend the defaults
  var globalConfig = window$1 && window$1.QUnit && window$1.QUnit.config;

  // only extend the global config if there is no QUnit overload
  if (window$1 && window$1.QUnit && !window$1.QUnit.version) {
  	extend(config, globalConfig);
  }

  // Push a loose unnamed module to the modules collection
  config.modules.push(config.currentModule);

  // Based on jsDump by Ariel Flesler
  // http://flesler.blogspot.com/2008/05/jsdump-pretty-dump-of-any-javascript.html
  var dump = (function () {
  	function quote(str) {
  		return "\"" + str.toString().replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
  	}
  	function literal(o) {
  		return o + "";
  	}
  	function join(pre, arr, post) {
  		var s = dump.separator(),
  		    base = dump.indent(),
  		    inner = dump.indent(1);
  		if (arr.join) {
  			arr = arr.join("," + s + inner);
  		}
  		if (!arr) {
  			return pre + post;
  		}
  		return [pre, inner + arr, base + post].join(s);
  	}
  	function array(arr, stack) {
  		var i = arr.length,
  		    ret = new Array(i);

  		if (dump.maxDepth && dump.depth > dump.maxDepth) {
  			return "[object Array]";
  		}

  		this.up();
  		while (i--) {
  			ret[i] = this.parse(arr[i], undefined, stack);
  		}
  		this.down();
  		return join("[", ret, "]");
  	}

  	function isArray(obj) {
  		return (

  			//Native Arrays
  			toString.call(obj) === "[object Array]" ||

  			// NodeList objects
  			typeof obj.length === "number" && obj.item !== undefined && (obj.length ? obj.item(0) === obj[0] : obj.item(0) === null && obj[0] === undefined)
  		);
  	}

  	var reName = /^function (\w+)/,
  	    dump = {

  		// The objType is used mostly internally, you can fix a (custom) type in advance
  		parse: function parse(obj, objType, stack) {
  			stack = stack || [];
  			var res,
  			    parser,
  			    parserType,
  			    objIndex = stack.indexOf(obj);

  			if (objIndex !== -1) {
  				return "recursion(" + (objIndex - stack.length) + ")";
  			}

  			objType = objType || this.typeOf(obj);
  			parser = this.parsers[objType];
  			parserType = typeof parser === "undefined" ? "undefined" : _typeof(parser);

  			if (parserType === "function") {
  				stack.push(obj);
  				res = parser.call(this, obj, stack);
  				stack.pop();
  				return res;
  			}
  			return parserType === "string" ? parser : this.parsers.error;
  		},
  		typeOf: function typeOf(obj) {
  			var type;

  			if (obj === null) {
  				type = "null";
  			} else if (typeof obj === "undefined") {
  				type = "undefined";
  			} else if (is("regexp", obj)) {
  				type = "regexp";
  			} else if (is("date", obj)) {
  				type = "date";
  			} else if (is("function", obj)) {
  				type = "function";
  			} else if (obj.setInterval !== undefined && obj.document !== undefined && obj.nodeType === undefined) {
  				type = "window";
  			} else if (obj.nodeType === 9) {
  				type = "document";
  			} else if (obj.nodeType) {
  				type = "node";
  			} else if (isArray(obj)) {
  				type = "array";
  			} else if (obj.constructor === Error.prototype.constructor) {
  				type = "error";
  			} else {
  				type = typeof obj === "undefined" ? "undefined" : _typeof(obj);
  			}
  			return type;
  		},

  		separator: function separator() {
  			if (this.multiline) {
  				return this.HTML ? "<br />" : "\n";
  			} else {
  				return this.HTML ? "&#160;" : " ";
  			}
  		},

  		// Extra can be a number, shortcut for increasing-calling-decreasing
  		indent: function indent(extra) {
  			if (!this.multiline) {
  				return "";
  			}
  			var chr = this.indentChar;
  			if (this.HTML) {
  				chr = chr.replace(/\t/g, "   ").replace(/ /g, "&#160;");
  			}
  			return new Array(this.depth + (extra || 0)).join(chr);
  		},
  		up: function up(a) {
  			this.depth += a || 1;
  		},
  		down: function down(a) {
  			this.depth -= a || 1;
  		},
  		setParser: function setParser(name, parser) {
  			this.parsers[name] = parser;
  		},

  		// The next 3 are exposed so you can use them
  		quote: quote,
  		literal: literal,
  		join: join,
  		depth: 1,
  		maxDepth: config.maxDepth,

  		// This is the list of parsers, to modify them, use dump.setParser
  		parsers: {
  			window: "[Window]",
  			document: "[Document]",
  			error: function error(_error) {
  				return "Error(\"" + _error.message + "\")";
  			},
  			unknown: "[Unknown]",
  			"null": "null",
  			"undefined": "undefined",
  			"function": function _function(fn) {
  				var ret = "function",


  				// Functions never have name in IE
  				name = "name" in fn ? fn.name : (reName.exec(fn) || [])[1];

  				if (name) {
  					ret += " " + name;
  				}
  				ret += "(";

  				ret = [ret, dump.parse(fn, "functionArgs"), "){"].join("");
  				return join(ret, dump.parse(fn, "functionCode"), "}");
  			},
  			array: array,
  			nodelist: array,
  			"arguments": array,
  			object: function object(map, stack) {
  				var keys,
  				    key,
  				    val,
  				    i,
  				    nonEnumerableProperties,
  				    ret = [];

  				if (dump.maxDepth && dump.depth > dump.maxDepth) {
  					return "[object Object]";
  				}

  				dump.up();
  				keys = [];
  				for (key in map) {
  					keys.push(key);
  				}

  				// Some properties are not always enumerable on Error objects.
  				nonEnumerableProperties = ["message", "name"];
  				for (i in nonEnumerableProperties) {
  					key = nonEnumerableProperties[i];
  					if (key in map && !inArray(key, keys)) {
  						keys.push(key);
  					}
  				}
  				keys.sort();
  				for (i = 0; i < keys.length; i++) {
  					key = keys[i];
  					val = map[key];
  					ret.push(dump.parse(key, "key") + ": " + dump.parse(val, undefined, stack));
  				}
  				dump.down();
  				return join("{", ret, "}");
  			},
  			node: function node(_node) {
  				var len,
  				    i,
  				    val,
  				    open = dump.HTML ? "&lt;" : "<",
  				    close = dump.HTML ? "&gt;" : ">",
  				    tag = _node.nodeName.toLowerCase(),
  				    ret = open + tag,
  				    attrs = _node.attributes;

  				if (attrs) {
  					for (i = 0, len = attrs.length; i < len; i++) {
  						val = attrs[i].nodeValue;

  						// IE6 includes all attributes in .attributes, even ones not explicitly
  						// set. Those have values like undefined, null, 0, false, "" or
  						// "inherit".
  						if (val && val !== "inherit") {
  							ret += " " + attrs[i].nodeName + "=" + dump.parse(val, "attribute");
  						}
  					}
  				}
  				ret += close;

  				// Show content of TextNode or CDATASection
  				if (_node.nodeType === 3 || _node.nodeType === 4) {
  					ret += _node.nodeValue;
  				}

  				return ret + open + "/" + tag + close;
  			},

  			// Function calls it internally, it's the arguments part of the function
  			functionArgs: function functionArgs(fn) {
  				var args,
  				    l = fn.length;

  				if (!l) {
  					return "";
  				}

  				args = new Array(l);
  				while (l--) {

  					// 97 is 'a'
  					args[l] = String.fromCharCode(97 + l);
  				}
  				return " " + args.join(", ") + " ";
  			},

  			// Object calls it internally, the key part of an item in a map
  			key: quote,

  			// Function calls it internally, it's the content of the function
  			functionCode: "[code]",

  			// Node calls it internally, it's a html attribute value
  			attribute: quote,
  			string: quote,
  			date: quote,
  			regexp: literal,
  			number: literal,
  			"boolean": literal,
  			symbol: function symbol(sym) {
  				return sym.toString();
  			}
  		},

  		// If true, entities are escaped ( <, >, \t, space and \n )
  		HTML: false,

  		// Indentation unit
  		indentChar: "  ",

  		// If true, items in a collection, are separated by a \n, else just a space.
  		multiline: true
  	};

  	return dump;
  })();

  var SuiteReport = function () {
  	function SuiteReport(name, parentSuite) {
  		classCallCheck(this, SuiteReport);

  		this.name = name;
  		this.fullName = parentSuite ? parentSuite.fullName.concat(name) : [];

  		this.tests = [];
  		this.childSuites = [];

  		if (parentSuite) {
  			parentSuite.pushChildSuite(this);
  		}
  	}

  	createClass(SuiteReport, [{
  		key: "start",
  		value: function start(recordTime) {
  			if (recordTime) {
  				this._startTime = performanceNow();

  				if (performance) {
  					var suiteLevel = this.fullName.length;
  					performance.mark("qunit_suite_" + suiteLevel + "_start");
  				}
  			}

  			return {
  				name: this.name,
  				fullName: this.fullName.slice(),
  				tests: this.tests.map(function (test) {
  					return test.start();
  				}),
  				childSuites: this.childSuites.map(function (suite) {
  					return suite.start();
  				}),
  				testCounts: {
  					total: this.getTestCounts().total
  				}
  			};
  		}
  	}, {
  		key: "end",
  		value: function end(recordTime) {
  			if (recordTime) {
  				this._endTime = performanceNow();

  				if (performance) {
  					var suiteLevel = this.fullName.length;
  					performance.mark("qunit_suite_" + suiteLevel + "_end");

  					var suiteName = this.fullName.join(" – ");

  					measure(suiteLevel === 0 ? "QUnit Test Run" : "QUnit Test Suite: " + suiteName, "qunit_suite_" + suiteLevel + "_start", "qunit_suite_" + suiteLevel + "_end");
  				}
  			}

  			return {
  				name: this.name,
  				fullName: this.fullName.slice(),
  				tests: this.tests.map(function (test) {
  					return test.end();
  				}),
  				childSuites: this.childSuites.map(function (suite) {
  					return suite.end();
  				}),
  				testCounts: this.getTestCounts(),
  				runtime: this.getRuntime(),
  				status: this.getStatus()
  			};
  		}
  	}, {
  		key: "pushChildSuite",
  		value: function pushChildSuite(suite) {
  			this.childSuites.push(suite);
  		}
  	}, {
  		key: "pushTest",
  		value: function pushTest(test) {
  			this.tests.push(test);
  		}
  	}, {
  		key: "getRuntime",
  		value: function getRuntime() {
  			return this._endTime - this._startTime;
  		}
  	}, {
  		key: "getTestCounts",
  		value: function getTestCounts() {
  			var counts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { passed: 0, failed: 0, skipped: 0, todo: 0, total: 0 };

  			counts = this.tests.reduce(function (counts, test) {
  				if (test.valid) {
  					counts[test.getStatus()]++;
  					counts.total++;
  				}

  				return counts;
  			}, counts);

  			return this.childSuites.reduce(function (counts, suite) {
  				return suite.getTestCounts(counts);
  			}, counts);
  		}
  	}, {
  		key: "getStatus",
  		value: function getStatus() {
  			var _getTestCounts = this.getTestCounts(),
  			    total = _getTestCounts.total,
  			    failed = _getTestCounts.failed,
  			    skipped = _getTestCounts.skipped,
  			    todo = _getTestCounts.todo;

  			if (failed) {
  				return "failed";
  			} else {
  				if (skipped === total) {
  					return "skipped";
  				} else if (todo === total) {
  					return "todo";
  				} else {
  					return "passed";
  				}
  			}
  		}
  	}]);
  	return SuiteReport;
  }();

  var focused = false;

  var moduleStack = [];

  function createModule(name, testEnvironment, modifiers) {
  	var parentModule = moduleStack.length ? moduleStack.slice(-1)[0] : null;
  	var moduleName = parentModule !== null ? [parentModule.name, name].join(" > ") : name;
  	var parentSuite = parentModule ? parentModule.suiteReport : globalSuite;

  	var skip = parentModule !== null && parentModule.skip || modifiers.skip;
  	var todo = parentModule !== null && parentModule.todo || modifiers.todo;

  	var module = {
  		name: moduleName,
  		parentModule: parentModule,
  		tests: [],
  		moduleId: generateHash(moduleName),
  		testsRun: 0,
  		unskippedTestsRun: 0,
  		childModules: [],
  		suiteReport: new SuiteReport(name, parentSuite),

  		// Pass along `skip` and `todo` properties from parent module, in case
  		// there is one, to childs. And use own otherwise.
  		// This property will be used to mark own tests and tests of child suites
  		// as either `skipped` or `todo`.
  		skip: skip,
  		todo: skip ? false : todo
  	};

  	var env = {};
  	if (parentModule) {
  		parentModule.childModules.push(module);
  		extend(env, parentModule.testEnvironment);
  	}
  	extend(env, testEnvironment);
  	module.testEnvironment = env;

  	config.modules.push(module);
  	return module;
  }

  function processModule(name, options, executeNow) {
  	var modifiers = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  	if (objectType(options) === "function") {
  		executeNow = options;
  		options = undefined;
  	}

  	var module = createModule(name, options, modifiers);

  	// Move any hooks to a 'hooks' object
  	var testEnvironment = module.testEnvironment;
  	var hooks = module.hooks = {};

  	setHookFromEnvironment(hooks, testEnvironment, "before");
  	setHookFromEnvironment(hooks, testEnvironment, "beforeEach");
  	setHookFromEnvironment(hooks, testEnvironment, "afterEach");
  	setHookFromEnvironment(hooks, testEnvironment, "after");

  	var moduleFns = {
  		before: setHookFunction(module, "before"),
  		beforeEach: setHookFunction(module, "beforeEach"),
  		afterEach: setHookFunction(module, "afterEach"),
  		after: setHookFunction(module, "after")
  	};

  	var currentModule = config.currentModule;
  	if (objectType(executeNow) === "function") {
  		moduleStack.push(module);
  		config.currentModule = module;
  		executeNow.call(module.testEnvironment, moduleFns);
  		moduleStack.pop();
  		module = module.parentModule || currentModule;
  	}

  	config.currentModule = module;

  	function setHookFromEnvironment(hooks, environment, name) {
  		var potentialHook = environment[name];
  		hooks[name] = typeof potentialHook === "function" ? [potentialHook] : [];
  		delete environment[name];
  	}

  	function setHookFunction(module, hookName) {
  		return function setHook(callback) {
  			module.hooks[hookName].push(callback);
  		};
  	}
  }

  function module$1(name, options, executeNow) {
  	if (focused) {
  		return;
  	}

  	processModule(name, options, executeNow);
  }

  module$1.only = function () {
  	if (focused) {
  		return;
  	}

  	config.modules.length = 0;
  	config.queue.length = 0;

  	module$1.apply(undefined, arguments);

  	focused = true;
  };

  module$1.skip = function (name, options, executeNow) {
  	if (focused) {
  		return;
  	}

  	processModule(name, options, executeNow, { skip: true });
  };

  module$1.todo = function (name, options, executeNow) {
  	if (focused) {
  		return;
  	}

  	processModule(name, options, executeNow, { todo: true });
  };

  var LISTENERS = Object.create(null);
  var SUPPORTED_EVENTS = ["runStart", "suiteStart", "testStart", "assertion", "testEnd", "suiteEnd", "runEnd"];

  /**
   * Emits an event with the specified data to all currently registered listeners.
   * Callbacks will fire in the order in which they are registered (FIFO). This
   * function is not exposed publicly; it is used by QUnit internals to emit
   * logging events.
   *
   * @private
   * @method emit
   * @param {String} eventName
   * @param {Object} data
   * @return {Void}
   */
  function emit(eventName, data) {
  	if (objectType(eventName) !== "string") {
  		throw new TypeError("eventName must be a string when emitting an event");
  	}

  	// Clone the callbacks in case one of them registers a new callback
  	var originalCallbacks = LISTENERS[eventName];
  	var callbacks = originalCallbacks ? [].concat(toConsumableArray(originalCallbacks)) : [];

  	for (var i = 0; i < callbacks.length; i++) {
  		callbacks[i](data);
  	}
  }

  /**
   * Registers a callback as a listener to the specified event.
   *
   * @public
   * @method on
   * @param {String} eventName
   * @param {Function} callback
   * @return {Void}
   */
  function on(eventName, callback) {
  	if (objectType(eventName) !== "string") {
  		throw new TypeError("eventName must be a string when registering a listener");
  	} else if (!inArray(eventName, SUPPORTED_EVENTS)) {
  		var events = SUPPORTED_EVENTS.join(", ");
  		throw new Error("\"" + eventName + "\" is not a valid event; must be one of: " + events + ".");
  	} else if (objectType(callback) !== "function") {
  		throw new TypeError("callback must be a function when registering a listener");
  	}

  	if (!LISTENERS[eventName]) {
  		LISTENERS[eventName] = [];
  	}

  	// Don't register the same callback more than once
  	if (!inArray(callback, LISTENERS[eventName])) {
  		LISTENERS[eventName].push(callback);
  	}
  }

  function objectOrFunction(x) {
    var type = typeof x === 'undefined' ? 'undefined' : _typeof(x);
    return x !== null && (type === 'object' || type === 'function');
  }

  function isFunction(x) {
    return typeof x === 'function';
  }



  var _isArray = void 0;
  if (Array.isArray) {
    _isArray = Array.isArray;
  } else {
    _isArray = function _isArray(x) {
      return Object.prototype.toString.call(x) === '[object Array]';
    };
  }

  var isArray = _isArray;

  var len = 0;
  var vertxNext = void 0;
  var customSchedulerFn = void 0;

  var asap = function asap(callback, arg) {
    queue[len] = callback;
    queue[len + 1] = arg;
    len += 2;
    if (len === 2) {
      // If len is 2, that means that we need to schedule an async flush.
      // If additional callbacks are queued before the queue is flushed, they
      // will be processed by this flush that we are scheduling.
      if (customSchedulerFn) {
        customSchedulerFn(flush);
      } else {
        scheduleFlush();
      }
    }
  };

  function setScheduler(scheduleFn) {
    customSchedulerFn = scheduleFn;
  }

  function setAsap(asapFn) {
    asap = asapFn;
  }

  var browserWindow = typeof window !== 'undefined' ? window : undefined;
  var browserGlobal = browserWindow || {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

  // test for web worker but not in IE10
  var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

  // node
  function useNextTick() {
    // node version 0.10.x displays a deprecation warning when nextTick is used recursively
    // see https://github.com/cujojs/when/issues/410 for details
    return function () {
      return process.nextTick(flush);
    };
  }

  // vertx
  function useVertxTimer() {
    if (typeof vertxNext !== 'undefined') {
      return function () {
        vertxNext(flush);
      };
    }

    return useSetTimeout();
  }

  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, { characterData: true });

    return function () {
      node.data = iterations = ++iterations % 2;
    };
  }

  // web worker
  function useMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function () {
      return channel.port2.postMessage(0);
    };
  }

  function useSetTimeout() {
    // Store setTimeout reference so es6-promise will be unaffected by
    // other code modifying setTimeout (like sinon.useFakeTimers())
    var globalSetTimeout = setTimeout;
    return function () {
      return globalSetTimeout(flush, 1);
    };
  }

  var queue = new Array(1000);
  function flush() {
    for (var i = 0; i < len; i += 2) {
      var callback = queue[i];
      var arg = queue[i + 1];

      callback(arg);

      queue[i] = undefined;
      queue[i + 1] = undefined;
    }

    len = 0;
  }

  function attemptVertx() {
    try {
      var vertx = Function('return this')().require('vertx');
      vertxNext = vertx.runOnLoop || vertx.runOnContext;
      return useVertxTimer();
    } catch (e) {
      return useSetTimeout();
    }
  }

  var scheduleFlush = void 0;
  // Decide what async method to use to triggering processing of queued callbacks:
  if (isNode) {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else if (isWorker) {
    scheduleFlush = useMessageChannel();
  } else if (browserWindow === undefined && typeof require === 'function') {
    scheduleFlush = attemptVertx();
  } else {
    scheduleFlush = useSetTimeout();
  }

  function then(onFulfillment, onRejection) {
    var parent = this;

    var child = new this.constructor(noop);

    if (child[PROMISE_ID] === undefined) {
      makePromise(child);
    }

    var _state = parent._state;


    if (_state) {
      var callback = arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    } else {
      subscribe(parent, child, onFulfillment, onRejection);
    }

    return child;
  }

  /**
    `Promise.resolve` returns a promise that will become resolved with the
    passed `value`. It is shorthand for the following:

    ```javascript
    let promise = new Promise(function(resolve, reject){
      resolve(1);
    });

    promise.then(function(value){
      // value === 1
    });
    ```

    Instead of writing the above, your code now simply becomes the following:

    ```javascript
    let promise = Promise.resolve(1);

    promise.then(function(value){
      // value === 1
    });
    ```

    @method resolve
    @static
    @param {Any} value value that the returned promise will be resolved with
    Useful for tooling.
    @return {Promise} a promise that will become fulfilled with the given
    `value`
  */
  function resolve$1(object) {
    /*jshint validthis:true */
    var Constructor = this;

    if (object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && object.constructor === Constructor) {
      return object;
    }

    var promise = new Constructor(noop);
    resolve(promise, object);
    return promise;
  }

  var PROMISE_ID = Math.random().toString(36).substring(2);

  function noop() {}

  var PENDING = void 0;
  var FULFILLED = 1;
  var REJECTED = 2;

  var TRY_CATCH_ERROR = { error: null };

  function selfFulfillment() {
    return new TypeError("You cannot resolve a promise with itself");
  }

  function cannotReturnOwn() {
    return new TypeError('A promises callback cannot return that same promise.');
  }

  function getThen(promise) {
    try {
      return promise.then;
    } catch (error) {
      TRY_CATCH_ERROR.error = error;
      return TRY_CATCH_ERROR;
    }
  }

  function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
    try {
      then$$1.call(value, fulfillmentHandler, rejectionHandler);
    } catch (e) {
      return e;
    }
  }

  function handleForeignThenable(promise, thenable, then$$1) {
    asap(function (promise) {
      var sealed = false;
      var error = tryThen(then$$1, thenable, function (value) {
        if (sealed) {
          return;
        }
        sealed = true;
        if (thenable !== value) {
          resolve(promise, value);
        } else {
          fulfill(promise, value);
        }
      }, function (reason) {
        if (sealed) {
          return;
        }
        sealed = true;

        reject(promise, reason);
      }, 'Settle: ' + (promise._label || ' unknown promise'));

      if (!sealed && error) {
        sealed = true;
        reject(promise, error);
      }
    }, promise);
  }

  function handleOwnThenable(promise, thenable) {
    if (thenable._state === FULFILLED) {
      fulfill(promise, thenable._result);
    } else if (thenable._state === REJECTED) {
      reject(promise, thenable._result);
    } else {
      subscribe(thenable, undefined, function (value) {
        return resolve(promise, value);
      }, function (reason) {
        return reject(promise, reason);
      });
    }
  }

  function handleMaybeThenable(promise, maybeThenable, then$$1) {
    if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
      handleOwnThenable(promise, maybeThenable);
    } else {
      if (then$$1 === TRY_CATCH_ERROR) {
        reject(promise, TRY_CATCH_ERROR.error);
        TRY_CATCH_ERROR.error = null;
      } else if (then$$1 === undefined) {
        fulfill(promise, maybeThenable);
      } else if (isFunction(then$$1)) {
        handleForeignThenable(promise, maybeThenable, then$$1);
      } else {
        fulfill(promise, maybeThenable);
      }
    }
  }

  function resolve(promise, value) {
    if (promise === value) {
      reject(promise, selfFulfillment());
    } else if (objectOrFunction(value)) {
      handleMaybeThenable(promise, value, getThen(value));
    } else {
      fulfill(promise, value);
    }
  }

  function publishRejection(promise) {
    if (promise._onerror) {
      promise._onerror(promise._result);
    }

    publish(promise);
  }

  function fulfill(promise, value) {
    if (promise._state !== PENDING) {
      return;
    }

    promise._result = value;
    promise._state = FULFILLED;

    if (promise._subscribers.length !== 0) {
      asap(publish, promise);
    }
  }

  function reject(promise, reason) {
    if (promise._state !== PENDING) {
      return;
    }
    promise._state = REJECTED;
    promise._result = reason;

    asap(publishRejection, promise);
  }

  function subscribe(parent, child, onFulfillment, onRejection) {
    var _subscribers = parent._subscribers;
    var length = _subscribers.length;


    parent._onerror = null;

    _subscribers[length] = child;
    _subscribers[length + FULFILLED] = onFulfillment;
    _subscribers[length + REJECTED] = onRejection;

    if (length === 0 && parent._state) {
      asap(publish, parent);
    }
  }

  function publish(promise) {
    var subscribers = promise._subscribers;
    var settled = promise._state;

    if (subscribers.length === 0) {
      return;
    }

    var child = void 0,
        callback = void 0,
        detail = promise._result;

    for (var i = 0; i < subscribers.length; i += 3) {
      child = subscribers[i];
      callback = subscribers[i + settled];

      if (child) {
        invokeCallback(settled, child, callback, detail);
      } else {
        callback(detail);
      }
    }

    promise._subscribers.length = 0;
  }

  function tryCatch(callback, detail) {
    try {
      return callback(detail);
    } catch (e) {
      TRY_CATCH_ERROR.error = e;
      return TRY_CATCH_ERROR;
    }
  }

  function invokeCallback(settled, promise, callback, detail) {
    var hasCallback = isFunction(callback),
        value = void 0,
        error = void 0,
        succeeded = void 0,
        failed = void 0;

    if (hasCallback) {
      value = tryCatch(callback, detail);

      if (value === TRY_CATCH_ERROR) {
        failed = true;
        error = value.error;
        value.error = null;
      } else {
        succeeded = true;
      }

      if (promise === value) {
        reject(promise, cannotReturnOwn());
        return;
      }
    } else {
      value = detail;
      succeeded = true;
    }

    if (promise._state !== PENDING) {
      // noop
    } else if (hasCallback && succeeded) {
      resolve(promise, value);
    } else if (failed) {
      reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      reject(promise, value);
    }
  }

  function initializePromise(promise, resolver) {
    try {
      resolver(function resolvePromise(value) {
        resolve(promise, value);
      }, function rejectPromise(reason) {
        reject(promise, reason);
      });
    } catch (e) {
      reject(promise, e);
    }
  }

  var id = 0;
  function nextId() {
    return id++;
  }

  function makePromise(promise) {
    promise[PROMISE_ID] = id++;
    promise._state = undefined;
    promise._result = undefined;
    promise._subscribers = [];
  }

  function validationError() {
    return new Error('Array Methods must be provided an Array');
  }

  var Enumerator = function () {
    function Enumerator(Constructor, input) {
      classCallCheck(this, Enumerator);

      this._instanceConstructor = Constructor;
      this.promise = new Constructor(noop);

      if (!this.promise[PROMISE_ID]) {
        makePromise(this.promise);
      }

      if (isArray(input)) {
        this.length = input.length;
        this._remaining = input.length;

        this._result = new Array(this.length);

        if (this.length === 0) {
          fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate(input);
          if (this._remaining === 0) {
            fulfill(this.promise, this._result);
          }
        }
      } else {
        reject(this.promise, validationError());
      }
    }

    createClass(Enumerator, [{
      key: '_enumerate',
      value: function _enumerate(input) {
        for (var i = 0; this._state === PENDING && i < input.length; i++) {
          this._eachEntry(input[i], i);
        }
      }
    }, {
      key: '_eachEntry',
      value: function _eachEntry(entry, i) {
        var c = this._instanceConstructor;
        var resolve$$1 = c.resolve;


        if (resolve$$1 === resolve$1) {
          var _then = getThen(entry);

          if (_then === then && entry._state !== PENDING) {
            this._settledAt(entry._state, i, entry._result);
          } else if (typeof _then !== 'function') {
            this._remaining--;
            this._result[i] = entry;
          } else if (c === Promise$2) {
            var promise = new c(noop);
            handleMaybeThenable(promise, entry, _then);
            this._willSettleAt(promise, i);
          } else {
            this._willSettleAt(new c(function (resolve$$1) {
              return resolve$$1(entry);
            }), i);
          }
        } else {
          this._willSettleAt(resolve$$1(entry), i);
        }
      }
    }, {
      key: '_settledAt',
      value: function _settledAt(state, i, value) {
        var promise = this.promise;


        if (promise._state === PENDING) {
          this._remaining--;

          if (state === REJECTED) {
            reject(promise, value);
          } else {
            this._result[i] = value;
          }
        }

        if (this._remaining === 0) {
          fulfill(promise, this._result);
        }
      }
    }, {
      key: '_willSettleAt',
      value: function _willSettleAt(promise, i) {
        var enumerator = this;

        subscribe(promise, undefined, function (value) {
          return enumerator._settledAt(FULFILLED, i, value);
        }, function (reason) {
          return enumerator._settledAt(REJECTED, i, reason);
        });
      }
    }]);
    return Enumerator;
  }();

  /**
    `Promise.all` accepts an array of promises, and returns a new promise which
    is fulfilled with an array of fulfillment values for the passed promises, or
    rejected with the reason of the first passed promise to be rejected. It casts all
    elements of the passed iterable to promises as it runs this algorithm.

    Example:

    ```javascript
    let promise1 = resolve(1);
    let promise2 = resolve(2);
    let promise3 = resolve(3);
    let promises = [ promise1, promise2, promise3 ];

    Promise.all(promises).then(function(array){
      // The array here would be [ 1, 2, 3 ];
    });
    ```

    If any of the `promises` given to `all` are rejected, the first promise
    that is rejected will be given as an argument to the returned promises's
    rejection handler. For example:

    Example:

    ```javascript
    let promise1 = resolve(1);
    let promise2 = reject(new Error("2"));
    let promise3 = reject(new Error("3"));
    let promises = [ promise1, promise2, promise3 ];

    Promise.all(promises).then(function(array){
      // Code here never runs because there are rejected promises!
    }, function(error) {
      // error.message === "2"
    });
    ```

    @method all
    @static
    @param {Array} entries array of promises
    @param {String} label optional string for labeling the promise.
    Useful for tooling.
    @return {Promise} promise that is fulfilled when all `promises` have been
    fulfilled, or rejected if any of them become rejected.
    @static
  */
  function all(entries) {
    return new Enumerator(this, entries).promise;
  }

  /**
    `Promise.race` returns a new promise which is settled in the same way as the
    first passed promise to settle.

    Example:

    ```javascript
    let promise1 = new Promise(function(resolve, reject){
      setTimeout(function(){
        resolve('promise 1');
      }, 200);
    });

    let promise2 = new Promise(function(resolve, reject){
      setTimeout(function(){
        resolve('promise 2');
      }, 100);
    });

    Promise.race([promise1, promise2]).then(function(result){
      // result === 'promise 2' because it was resolved before promise1
      // was resolved.
    });
    ```

    `Promise.race` is deterministic in that only the state of the first
    settled promise matters. For example, even if other promises given to the
    `promises` array argument are resolved, but the first settled promise has
    become rejected before the other promises became fulfilled, the returned
    promise will become rejected:

    ```javascript
    let promise1 = new Promise(function(resolve, reject){
      setTimeout(function(){
        resolve('promise 1');
      }, 200);
    });

    let promise2 = new Promise(function(resolve, reject){
      setTimeout(function(){
        reject(new Error('promise 2'));
      }, 100);
    });

    Promise.race([promise1, promise2]).then(function(result){
      // Code here never runs
    }, function(reason){
      // reason.message === 'promise 2' because promise 2 became rejected before
      // promise 1 became fulfilled
    });
    ```

    An example real-world use case is implementing timeouts:

    ```javascript
    Promise.race([ajax('foo.json'), timeout(5000)])
    ```

    @method race
    @static
    @param {Array} promises array of promises to observe
    Useful for tooling.
    @return {Promise} a promise which settles in the same way as the first passed
    promise to settle.
  */
  function race(entries) {
    /*jshint validthis:true */
    var Constructor = this;

    if (!isArray(entries)) {
      return new Constructor(function (_, reject) {
        return reject(new TypeError('You must pass an array to race.'));
      });
    } else {
      return new Constructor(function (resolve, reject) {
        var length = entries.length;
        for (var i = 0; i < length; i++) {
          Constructor.resolve(entries[i]).then(resolve, reject);
        }
      });
    }
  }

  /**
    `Promise.reject` returns a promise rejected with the passed `reason`.
    It is shorthand for the following:

    ```javascript
    let promise = new Promise(function(resolve, reject){
      reject(new Error('WHOOPS'));
    });

    promise.then(function(value){
      // Code here doesn't run because the promise is rejected!
    }, function(reason){
      // reason.message === 'WHOOPS'
    });
    ```

    Instead of writing the above, your code now simply becomes the following:

    ```javascript
    let promise = Promise.reject(new Error('WHOOPS'));

    promise.then(function(value){
      // Code here doesn't run because the promise is rejected!
    }, function(reason){
      // reason.message === 'WHOOPS'
    });
    ```

    @method reject
    @static
    @param {Any} reason value that the returned promise will be rejected with.
    Useful for tooling.
    @return {Promise} a promise rejected with the given `reason`.
  */
  function reject$1(reason) {
    /*jshint validthis:true */
    var Constructor = this;
    var promise = new Constructor(noop);
    reject(promise, reason);
    return promise;
  }

  function needsResolver() {
    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
  }

  function needsNew() {
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  /**
    Promise objects represent the eventual result of an asynchronous operation. The
    primary way of interacting with a promise is through its `then` method, which
    registers callbacks to receive either a promise's eventual value or the reason
    why the promise cannot be fulfilled.

    Terminology
    -----------

    - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
    - `thenable` is an object or function that defines a `then` method.
    - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
    - `exception` is a value that is thrown using the throw statement.
    - `reason` is a value that indicates why a promise was rejected.
    - `settled` the final resting state of a promise, fulfilled or rejected.

    A promise can be in one of three states: pending, fulfilled, or rejected.

    Promises that are fulfilled have a fulfillment value and are in the fulfilled
    state.  Promises that are rejected have a rejection reason and are in the
    rejected state.  A fulfillment value is never a thenable.

    Promises can also be said to *resolve* a value.  If this value is also a
    promise, then the original promise's settled state will match the value's
    settled state.  So a promise that *resolves* a promise that rejects will
    itself reject, and a promise that *resolves* a promise that fulfills will
    itself fulfill.


    Basic Usage:
    ------------

    ```js
    let promise = new Promise(function(resolve, reject) {
      // on success
      resolve(value);

      // on failure
      reject(reason);
    });

    promise.then(function(value) {
      // on fulfillment
    }, function(reason) {
      // on rejection
    });
    ```

    Advanced Usage:
    ---------------

    Promises shine when abstracting away asynchronous interactions such as
    `XMLHttpRequest`s.

    ```js
    function getJSON(url) {
      return new Promise(function(resolve, reject){
        let xhr = new XMLHttpRequest();

        xhr.open('GET', url);
        xhr.onreadystatechange = handler;
        xhr.responseType = 'json';
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send();

        function handler() {
          if (this.readyState === this.DONE) {
            if (this.status === 200) {
              resolve(this.response);
            } else {
              reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
            }
          }
        };
      });
    }

    getJSON('/posts.json').then(function(json) {
      // on fulfillment
    }, function(reason) {
      // on rejection
    });
    ```

    Unlike callbacks, promises are great composable primitives.

    ```js
    Promise.all([
      getJSON('/posts'),
      getJSON('/comments')
    ]).then(function(values){
      values[0] // => postsJSON
      values[1] // => commentsJSON

      return values;
    });
    ```

    @class Promise
    @param {Function} resolver
    Useful for tooling.
    @constructor
  */

  var Promise$2 = function () {
    function Promise(resolver) {
      classCallCheck(this, Promise);

      this[PROMISE_ID] = nextId();
      this._result = this._state = undefined;
      this._subscribers = [];

      if (noop !== resolver) {
        typeof resolver !== 'function' && needsResolver();
        this instanceof Promise ? initializePromise(this, resolver) : needsNew();
      }
    }

    /**
    The primary way of interacting with a promise is through its `then` method,
    which registers callbacks to receive either a promise's eventual value or the
    reason why the promise cannot be fulfilled.
     ```js
    findUser().then(function(user){
      // user is available
    }, function(reason){
      // user is unavailable, and you are given the reason why
    });
    ```
     Chaining
    --------
     The return value of `then` is itself a promise.  This second, 'downstream'
    promise is resolved with the return value of the first promise's fulfillment
    or rejection handler, or rejected if the handler throws an exception.
     ```js
    findUser().then(function (user) {
      return user.name;
    }, function (reason) {
      return 'default name';
    }).then(function (userName) {
      // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
      // will be `'default name'`
    });
     findUser().then(function (user) {
      throw new Error('Found user, but still unhappy');
    }, function (reason) {
      throw new Error('`findUser` rejected and we're unhappy');
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
      // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
    });
    ```
    If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
     ```js
    findUser().then(function (user) {
      throw new PedagogicalException('Upstream error');
    }).then(function (value) {
      // never reached
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // The `PedgagocialException` is propagated all the way down to here
    });
    ```
     Assimilation
    ------------
     Sometimes the value you want to propagate to a downstream promise can only be
    retrieved asynchronously. This can be achieved by returning a promise in the
    fulfillment or rejection handler. The downstream promise will then be pending
    until the returned promise is settled. This is called *assimilation*.
     ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // The user's comments are now available
    });
    ```
     If the assimliated promise rejects, then the downstream promise will also reject.
     ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // If `findCommentsByAuthor` fulfills, we'll have the value here
    }, function (reason) {
      // If `findCommentsByAuthor` rejects, we'll have the reason here
    });
    ```
     Simple Example
    --------------
     Synchronous Example
     ```javascript
    let result;
     try {
      result = findResult();
      // success
    } catch(reason) {
      // failure
    }
    ```
     Errback Example
     ```js
    findResult(function(result, err){
      if (err) {
        // failure
      } else {
        // success
      }
    });
    ```
     Promise Example;
     ```javascript
    findResult().then(function(result){
      // success
    }, function(reason){
      // failure
    });
    ```
     Advanced Example
    --------------
     Synchronous Example
     ```javascript
    let author, books;
     try {
      author = findAuthor();
      books  = findBooksByAuthor(author);
      // success
    } catch(reason) {
      // failure
    }
    ```
     Errback Example
     ```js
     function foundBooks(books) {
     }
     function failure(reason) {
     }
     findAuthor(function(author, err){
      if (err) {
        failure(err);
        // failure
      } else {
        try {
          findBoooksByAuthor(author, function(books, err) {
            if (err) {
              failure(err);
            } else {
              try {
                foundBooks(books);
              } catch(reason) {
                failure(reason);
              }
            }
          });
        } catch(error) {
          failure(err);
        }
        // success
      }
    });
    ```
     Promise Example;
     ```javascript
    findAuthor().
      then(findBooksByAuthor).
      then(function(books){
        // found books
    }).catch(function(reason){
      // something went wrong
    });
    ```
     @method then
    @param {Function} onFulfilled
    @param {Function} onRejected
    Useful for tooling.
    @return {Promise}
    */

    /**
    `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
    as the catch block of a try/catch statement.
    ```js
    function findAuthor(){
    throw new Error('couldn't find that author');
    }
    // synchronous
    try {
    findAuthor();
    } catch(reason) {
    // something went wrong
    }
    // async with promises
    findAuthor().catch(function(reason){
    // something went wrong
    });
    ```
    @method catch
    @param {Function} onRejection
    Useful for tooling.
    @return {Promise}
    */


    createClass(Promise, [{
      key: 'catch',
      value: function _catch(onRejection) {
        return this.then(null, onRejection);
      }

      /**
        `finally` will be invoked regardless of the promise's fate just as native
        try/catch/finally behaves
      
        Synchronous example:
      
        ```js
        findAuthor() {
          if (Math.random() > 0.5) {
            throw new Error();
          }
          return new Author();
        }
      
        try {
          return findAuthor(); // succeed or fail
        } catch(error) {
          return findOtherAuther();
        } finally {
          // always runs
          // doesn't affect the return value
        }
        ```
      
        Asynchronous example:
      
        ```js
        findAuthor().catch(function(reason){
          return findOtherAuther();
        }).finally(function(){
          // author was either found, or not
        });
        ```
      
        @method finally
        @param {Function} callback
        @return {Promise}
      */

    }, {
      key: 'finally',
      value: function _finally(callback) {
        var promise = this;
        var constructor = promise.constructor;

        if (isFunction(callback)) {
          return promise.then(function (value) {
            return constructor.resolve(callback()).then(function () {
              return value;
            });
          }, function (reason) {
            return constructor.resolve(callback()).then(function () {
              throw reason;
            });
          });
        }

        return promise.then(callback, callback);
      }
    }]);
    return Promise;
  }();

  Promise$2.prototype.then = then;
  Promise$2.all = all;
  Promise$2.race = race;
  Promise$2.resolve = resolve$1;
  Promise$2.reject = reject$1;
  Promise$2._setScheduler = setScheduler;
  Promise$2._setAsap = setAsap;
  Promise$2._asap = asap;

  /*global self*/
  function polyfill() {
    var local = void 0;

    if (typeof global !== 'undefined') {
      local = global;
    } else if (typeof self !== 'undefined') {
      local = self;
    } else {
      try {
        local = Function('return this')();
      } catch (e) {
        throw new Error('polyfill failed because global object is unavailable in this environment');
      }
    }

    var P = local.Promise;

    if (P) {
      var promiseToString = null;
      try {
        promiseToString = Object.prototype.toString.call(P.resolve());
      } catch (e) {
        // silently ignored
      }

      if (promiseToString === '[object Promise]' && !P.cast) {
        return;
      }
    }

    local.Promise = Promise$2;
  }

  // Strange compat..
  Promise$2.polyfill = polyfill;
  Promise$2.Promise = Promise$2;

  var Promise$1 = typeof Promise !== "undefined" ? Promise : Promise$2;

  // Register logging callbacks
  function registerLoggingCallbacks(obj) {
  	var i,
  	    l,
  	    key,
  	    callbackNames = ["begin", "done", "log", "testStart", "testDone", "moduleStart", "moduleDone"];

  	function registerLoggingCallback(key) {
  		var loggingCallback = function loggingCallback(callback) {
  			if (objectType(callback) !== "function") {
  				throw new Error("QUnit logging methods require a callback function as their first parameters.");
  			}

  			config.callbacks[key].push(callback);
  		};

  		return loggingCallback;
  	}

  	for (i = 0, l = callbackNames.length; i < l; i++) {
  		key = callbackNames[i];

  		// Initialize key collection of logging callback
  		if (objectType(config.callbacks[key]) === "undefined") {
  			config.callbacks[key] = [];
  		}

  		obj[key] = registerLoggingCallback(key);
  	}
  }

  function runLoggingCallbacks(key, args) {
  	var callbacks = config.callbacks[key];

  	// Handling 'log' callbacks separately. Unlike the other callbacks,
  	// the log callback is not controlled by the processing queue,
  	// but rather used by asserts. Hence to promisfy the 'log' callback
  	// would mean promisfying each step of a test
  	if (key === "log") {
  		callbacks.map(function (callback) {
  			return callback(args);
  		});
  		return;
  	}

  	// ensure that each callback is executed serially
  	return callbacks.reduce(function (promiseChain, callback) {
  		return promiseChain.then(function () {
  			return Promise$1.resolve(callback(args));
  		});
  	}, Promise$1.resolve([]));
  }

  // Doesn't support IE9, it will return undefined on these browsers
  // See also https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error/Stack
  var fileName = (sourceFromStacktrace(0) || "").replace(/(:\d+)+\)?/, "").replace(/.+\//, "");

  function extractStacktrace(e, offset) {
  	offset = offset === undefined ? 4 : offset;

  	var stack, include, i;

  	if (e && e.stack) {
  		stack = e.stack.split("\n");
  		if (/^error$/i.test(stack[0])) {
  			stack.shift();
  		}
  		if (fileName) {
  			include = [];
  			for (i = offset; i < stack.length; i++) {
  				if (stack[i].indexOf(fileName) !== -1) {
  					break;
  				}
  				include.push(stack[i]);
  			}
  			if (include.length) {
  				return include.join("\n");
  			}
  		}
  		return stack[offset];
  	}
  }

  function sourceFromStacktrace(offset) {
  	var error = new Error();

  	// Support: Safari <=7 only, IE <=10 - 11 only
  	// Not all browsers generate the `stack` property for `new Error()`, see also #636
  	if (!error.stack) {
  		try {
  			throw error;
  		} catch (err) {
  			error = err;
  		}
  	}

  	return extractStacktrace(error, offset);
  }

  var priorityCount = 0;
  var unitSampler = void 0;

  // This is a queue of functions that are tasks within a single test.
  // After tests are dequeued from config.queue they are expanded into
  // a set of tasks in this queue.
  var taskQueue = [];

  /**
   * Advances the taskQueue to the next task. If the taskQueue is empty,
   * process the testQueue
   */
  function advance() {
  	advanceTaskQueue();

  	if (!taskQueue.length && !config.blocking && !config.current) {
  		advanceTestQueue();
  	}
  }

  /**
   * Advances the taskQueue with an increased depth
   */
  function advanceTaskQueue() {
  	var start = now();
  	config.depth = (config.depth || 0) + 1;

  	processTaskQueue(start);

  	config.depth--;
  }

  /**
   * Process the first task on the taskQueue as a promise.
   * Each task is a function returned by https://github.com/qunitjs/qunit/blob/master/src/test.js#L381
   */
  function processTaskQueue(start) {
  	if (taskQueue.length && !config.blocking) {
  		var elapsedTime = now() - start;

  		if (!defined.setTimeout || config.updateRate <= 0 || elapsedTime < config.updateRate) {
  			var task = taskQueue.shift();
  			Promise$1.resolve(task()).then(function () {
  				if (!taskQueue.length) {
  					advance();
  				} else {
  					processTaskQueue(start);
  				}
  			});
  		} else {
  			setTimeout$1(advance);
  		}
  	}
  }

  /**
   * Advance the testQueue to the next test to process. Call done() if testQueue completes.
   */
  function advanceTestQueue() {
  	if (!config.blocking && !config.queue.length && config.depth === 0) {
  		done();
  		return;
  	}

  	var testTasks = config.queue.shift();
  	addToTaskQueue(testTasks());

  	if (priorityCount > 0) {
  		priorityCount--;
  	}

  	advance();
  }

  /**
   * Enqueue the tasks for a test into the task queue.
   * @param {Array} tasksArray
   */
  function addToTaskQueue(tasksArray) {
  	taskQueue.push.apply(taskQueue, toConsumableArray(tasksArray));
  }

  /**
   * Return the number of tasks remaining in the task queue to be processed.
   * @return {Number}
   */
  function taskQueueLength() {
  	return taskQueue.length;
  }

  /**
   * Adds a test to the TestQueue for execution.
   * @param {Function} testTasksFunc
   * @param {Boolean} prioritize
   * @param {String} seed
   */
  function addToTestQueue(testTasksFunc, prioritize, seed) {
  	if (prioritize) {
  		config.queue.splice(priorityCount++, 0, testTasksFunc);
  	} else if (seed) {
  		if (!unitSampler) {
  			unitSampler = unitSamplerGenerator(seed);
  		}

  		// Insert into a random position after all prioritized items
  		var index = Math.floor(unitSampler() * (config.queue.length - priorityCount + 1));
  		config.queue.splice(priorityCount + index, 0, testTasksFunc);
  	} else {
  		config.queue.push(testTasksFunc);
  	}
  }

  /**
   * Creates a seeded "sample" generator which is used for randomizing tests.
   */
  function unitSamplerGenerator(seed) {

  	// 32-bit xorshift, requires only a nonzero seed
  	// http://excamera.com/sphinx/article-xorshift.html
  	var sample = parseInt(generateHash(seed), 16) || -1;
  	return function () {
  		sample ^= sample << 13;
  		sample ^= sample >>> 17;
  		sample ^= sample << 5;

  		// ECMAScript has no unsigned number type
  		if (sample < 0) {
  			sample += 0x100000000;
  		}

  		return sample / 0x100000000;
  	};
  }

  /**
   * This function is called when the ProcessingQueue is done processing all
   * items. It handles emitting the final run events.
   */
  function done() {
  	var storage = config.storage;

  	ProcessingQueue.finished = true;

  	var runtime = now() - config.started;
  	var passed = config.stats.all - config.stats.bad;

  	if (config.stats.all === 0) {

  		if (config.filter && config.filter.length) {
  			throw new Error("No tests matched the filter \"" + config.filter + "\".");
  		}

  		if (config.module && config.module.length) {
  			throw new Error("No tests matched the module \"" + config.module + "\".");
  		}

  		if (config.moduleId && config.moduleId.length) {
  			throw new Error("No tests matched the moduleId \"" + config.moduleId + "\".");
  		}

  		if (config.testId && config.testId.length) {
  			throw new Error("No tests matched the testId \"" + config.testId + "\".");
  		}

  		throw new Error("No tests were run.");
  	}

  	emit("runEnd", globalSuite.end(true));
  	runLoggingCallbacks("done", {
  		passed: passed,
  		failed: config.stats.bad,
  		total: config.stats.all,
  		runtime: runtime
  	}).then(function () {

  		// Clear own storage items if all tests passed
  		if (storage && config.stats.bad === 0) {
  			for (var i = storage.length - 1; i >= 0; i--) {
  				var key = storage.key(i);

  				if (key.indexOf("qunit-test-") === 0) {
  					storage.removeItem(key);
  				}
  			}
  		}
  	});
  }

  var ProcessingQueue = {
  	finished: false,
  	add: addToTestQueue,
  	advance: advance,
  	taskCount: taskQueueLength
  };

  var TestReport = function () {
  	function TestReport(name, suite, options) {
  		classCallCheck(this, TestReport);

  		this.name = name;
  		this.suiteName = suite.name;
  		this.fullName = suite.fullName.concat(name);
  		this.runtime = 0;
  		this.assertions = [];

  		this.skipped = !!options.skip;
  		this.todo = !!options.todo;

  		this.valid = options.valid;

  		this._startTime = 0;
  		this._endTime = 0;

  		suite.pushTest(this);
  	}

  	createClass(TestReport, [{
  		key: "start",
  		value: function start(recordTime) {
  			if (recordTime) {
  				this._startTime = performanceNow();
  				if (performance) {
  					performance.mark("qunit_test_start");
  				}
  			}

  			return {
  				name: this.name,
  				suiteName: this.suiteName,
  				fullName: this.fullName.slice()
  			};
  		}
  	}, {
  		key: "end",
  		value: function end(recordTime) {
  			if (recordTime) {
  				this._endTime = performanceNow();
  				if (performance) {
  					performance.mark("qunit_test_end");

  					var testName = this.fullName.join(" – ");

  					measure("QUnit Test: " + testName, "qunit_test_start", "qunit_test_end");
  				}
  			}

  			return extend(this.start(), {
  				runtime: this.getRuntime(),
  				status: this.getStatus(),
  				errors: this.getFailedAssertions(),
  				assertions: this.getAssertions()
  			});
  		}
  	}, {
  		key: "pushAssertion",
  		value: function pushAssertion(assertion) {
  			this.assertions.push(assertion);
  		}
  	}, {
  		key: "getRuntime",
  		value: function getRuntime() {
  			return this._endTime - this._startTime;
  		}
  	}, {
  		key: "getStatus",
  		value: function getStatus() {
  			if (this.skipped) {
  				return "skipped";
  			}

  			var testPassed = this.getFailedAssertions().length > 0 ? this.todo : !this.todo;

  			if (!testPassed) {
  				return "failed";
  			} else if (this.todo) {
  				return "todo";
  			} else {
  				return "passed";
  			}
  		}
  	}, {
  		key: "getFailedAssertions",
  		value: function getFailedAssertions() {
  			return this.assertions.filter(function (assertion) {
  				return !assertion.passed;
  			});
  		}
  	}, {
  		key: "getAssertions",
  		value: function getAssertions() {
  			return this.assertions.slice();
  		}

  		// Remove actual and expected values from assertions. This is to prevent
  		// leaking memory throughout a test suite.

  	}, {
  		key: "slimAssertions",
  		value: function slimAssertions() {
  			this.assertions = this.assertions.map(function (assertion) {
  				delete assertion.actual;
  				delete assertion.expected;
  				return assertion;
  			});
  		}
  	}]);
  	return TestReport;
  }();

  var focused$1 = false;

  function Test(settings) {
  	var i, l;

  	++Test.count;

  	this.expected = null;
  	this.assertions = [];
  	this.semaphore = 0;
  	this.module = config.currentModule;
  	this.stack = sourceFromStacktrace(3);
  	this.steps = [];
  	this.timeout = undefined;

  	// If a module is skipped, all its tests and the tests of the child suites
  	// should be treated as skipped even if they are defined as `only` or `todo`.
  	// As for `todo` module, all its tests will be treated as `todo` except for
  	// tests defined as `skip` which will be left intact.
  	//
  	// So, if a test is defined as `todo` and is inside a skipped module, we should
  	// then treat that test as if was defined as `skip`.
  	if (this.module.skip) {
  		settings.skip = true;
  		settings.todo = false;

  		// Skipped tests should be left intact
  	} else if (this.module.todo && !settings.skip) {
  		settings.todo = true;
  	}

  	extend(this, settings);

  	this.testReport = new TestReport(settings.testName, this.module.suiteReport, {
  		todo: settings.todo,
  		skip: settings.skip,
  		valid: this.valid()
  	});

  	// Register unique strings
  	for (i = 0, l = this.module.tests; i < l.length; i++) {
  		if (this.module.tests[i].name === this.testName) {
  			this.testName += " ";
  		}
  	}

  	this.testId = generateHash(this.module.name, this.testName);

  	this.module.tests.push({
  		name: this.testName,
  		testId: this.testId,
  		skip: !!settings.skip
  	});

  	if (settings.skip) {

  		// Skipped tests will fully ignore any sent callback
  		this.callback = function () {};
  		this.async = false;
  		this.expected = 0;
  	} else {
  		if (typeof this.callback !== "function") {
  			var method = this.todo ? "todo" : "test";

  			// eslint-disable-next-line max-len
  			throw new TypeError("You must provide a function as a test callback to QUnit." + method + "(\"" + settings.testName + "\")");
  		}

  		this.assert = new Assert(this);
  	}
  }

  Test.count = 0;

  function getNotStartedModules(startModule) {
  	var module = startModule,
  	    modules = [];

  	while (module && module.testsRun === 0) {
  		modules.push(module);
  		module = module.parentModule;
  	}

  	// The above push modules from the child to the parent
  	// return a reversed order with the top being the top most parent module
  	return modules.reverse();
  }

  Test.prototype = {
  	before: function before() {
  		var _this = this;

  		var module = this.module,
  		    notStartedModules = getNotStartedModules(module);

  		// ensure the callbacks are executed serially for each module
  		var callbackPromises = notStartedModules.reduce(function (promiseChain, startModule) {
  			return promiseChain.then(function () {
  				startModule.stats = { all: 0, bad: 0, started: now() };
  				emit("suiteStart", startModule.suiteReport.start(true));
  				return runLoggingCallbacks("moduleStart", {
  					name: startModule.name,
  					tests: startModule.tests
  				});
  			});
  		}, Promise$1.resolve([]));

  		return callbackPromises.then(function () {
  			config.current = _this;

  			_this.testEnvironment = extend({}, module.testEnvironment);

  			_this.started = now();
  			emit("testStart", _this.testReport.start(true));
  			return runLoggingCallbacks("testStart", {
  				name: _this.testName,
  				module: module.name,
  				testId: _this.testId,
  				previousFailure: _this.previousFailure
  			}).then(function () {
  				if (!config.pollution) {
  					saveGlobal();
  				}
  			});
  		});
  	},

  	run: function run() {
  		var promise;

  		config.current = this;

  		this.callbackStarted = now();

  		if (config.notrycatch) {
  			runTest(this);
  			return;
  		}

  		try {
  			runTest(this);
  		} catch (e) {
  			this.pushFailure("Died on test #" + (this.assertions.length + 1) + " " + this.stack + ": " + (e.message || e), extractStacktrace(e, 0));

  			// Else next test will carry the responsibility
  			saveGlobal();

  			// Restart the tests if they're blocking
  			if (config.blocking) {
  				internalRecover(this);
  			}
  		}

  		function runTest(test) {
  			promise = test.callback.call(test.testEnvironment, test.assert);
  			test.resolvePromise(promise);

  			// If the test has a "lock" on it, but the timeout is 0, then we push a
  			// failure as the test should be synchronous.
  			if (test.timeout === 0 && test.semaphore !== 0) {
  				pushFailure("Test did not finish synchronously even though assert.timeout( 0 ) was used.", sourceFromStacktrace(2));
  			}
  		}
  	},

  	after: function after() {
  		checkPollution();
  	},

  	queueHook: function queueHook(hook, hookName, hookOwner) {
  		var _this2 = this;

  		var callHook = function callHook() {
  			var promise = hook.call(_this2.testEnvironment, _this2.assert);
  			_this2.resolvePromise(promise, hookName);
  		};

  		var runHook = function runHook() {
  			if (hookName === "before") {
  				if (hookOwner.unskippedTestsRun !== 0) {
  					return;
  				}

  				_this2.preserveEnvironment = true;
  			}

  			// The 'after' hook should only execute when there are not tests left and
  			// when the 'after' and 'finish' tasks are the only tasks left to process
  			if (hookName === "after" && hookOwner.unskippedTestsRun !== numberOfUnskippedTests(hookOwner) - 1 && (config.queue.length > 0 || ProcessingQueue.taskCount() > 2)) {
  				return;
  			}

  			config.current = _this2;
  			if (config.notrycatch) {
  				callHook();
  				return;
  			}
  			try {
  				callHook();
  			} catch (error) {
  				_this2.pushFailure(hookName + " failed on " + _this2.testName + ": " + (error.message || error), extractStacktrace(error, 0));
  			}
  		};

  		return runHook;
  	},


  	// Currently only used for module level hooks, can be used to add global level ones
  	hooks: function hooks(handler) {
  		var hooks = [];

  		function processHooks(test, module) {
  			if (module.parentModule) {
  				processHooks(test, module.parentModule);
  			}

  			if (module.hooks[handler].length) {
  				for (var i = 0; i < module.hooks[handler].length; i++) {
  					hooks.push(test.queueHook(module.hooks[handler][i], handler, module));
  				}
  			}
  		}

  		// Hooks are ignored on skipped tests
  		if (!this.skip) {
  			processHooks(this, this.module);
  		}

  		return hooks;
  	},


  	finish: function finish() {
  		config.current = this;

  		// Release the test callback to ensure that anything referenced has been
  		// released to be garbage collected.
  		this.callback = undefined;

  		if (this.steps.length) {
  			var stepsList = this.steps.join(", ");
  			this.pushFailure("Expected assert.verifySteps() to be called before end of test " + ("after using assert.step(). Unverified steps: " + stepsList), this.stack);
  		}

  		if (config.requireExpects && this.expected === null) {
  			this.pushFailure("Expected number of assertions to be defined, but expect() was " + "not called.", this.stack);
  		} else if (this.expected !== null && this.expected !== this.assertions.length) {
  			this.pushFailure("Expected " + this.expected + " assertions, but " + this.assertions.length + " were run", this.stack);
  		} else if (this.expected === null && !this.assertions.length) {
  			this.pushFailure("Expected at least one assertion, but none were run - call " + "expect(0) to accept zero assertions.", this.stack);
  		}

  		var i,
  		    module = this.module,
  		    moduleName = module.name,
  		    testName = this.testName,
  		    skipped = !!this.skip,
  		    todo = !!this.todo,
  		    bad = 0,
  		    storage = config.storage;

  		this.runtime = now() - this.started;

  		config.stats.all += this.assertions.length;
  		module.stats.all += this.assertions.length;

  		for (i = 0; i < this.assertions.length; i++) {
  			if (!this.assertions[i].result) {
  				bad++;
  				config.stats.bad++;
  				module.stats.bad++;
  			}
  		}

  		notifyTestsRan(module, skipped);

  		// Store result when possible
  		if (storage) {
  			if (bad) {
  				storage.setItem("qunit-test-" + moduleName + "-" + testName, bad);
  			} else {
  				storage.removeItem("qunit-test-" + moduleName + "-" + testName);
  			}
  		}

  		// After emitting the js-reporters event we cleanup the assertion data to
  		// avoid leaking it. It is not used by the legacy testDone callbacks.
  		emit("testEnd", this.testReport.end(true));
  		this.testReport.slimAssertions();

  		return runLoggingCallbacks("testDone", {
  			name: testName,
  			module: moduleName,
  			skipped: skipped,
  			todo: todo,
  			failed: bad,
  			passed: this.assertions.length - bad,
  			total: this.assertions.length,
  			runtime: skipped ? 0 : this.runtime,

  			// HTML Reporter use
  			assertions: this.assertions,
  			testId: this.testId,

  			// Source of Test
  			source: this.stack
  		}).then(function () {
  			if (module.testsRun === numberOfTests(module)) {
  				var completedModules = [module];

  				// Check if the parent modules, iteratively, are done. If that the case,
  				// we emit the `suiteEnd` event and trigger `moduleDone` callback.
  				var parent = module.parentModule;
  				while (parent && parent.testsRun === numberOfTests(parent)) {
  					completedModules.push(parent);
  					parent = parent.parentModule;
  				}

  				return completedModules.reduce(function (promiseChain, completedModule) {
  					return promiseChain.then(function () {
  						return logSuiteEnd(completedModule);
  					});
  				}, Promise$1.resolve([]));
  			}
  		}).then(function () {
  			config.current = undefined;
  		});

  		function logSuiteEnd(module) {

  			// Reset `module.hooks` to ensure that anything referenced in these hooks
  			// has been released to be garbage collected.
  			module.hooks = {};

  			emit("suiteEnd", module.suiteReport.end(true));
  			return runLoggingCallbacks("moduleDone", {
  				name: module.name,
  				tests: module.tests,
  				failed: module.stats.bad,
  				passed: module.stats.all - module.stats.bad,
  				total: module.stats.all,
  				runtime: now() - module.stats.started
  			});
  		}
  	},

  	preserveTestEnvironment: function preserveTestEnvironment() {
  		if (this.preserveEnvironment) {
  			this.module.testEnvironment = this.testEnvironment;
  			this.testEnvironment = extend({}, this.module.testEnvironment);
  		}
  	},

  	queue: function queue() {
  		var test = this;

  		if (!this.valid()) {
  			return;
  		}

  		function runTest() {
  			return [function () {
  				return test.before();
  			}].concat(toConsumableArray(test.hooks("before")), [function () {
  				test.preserveTestEnvironment();
  			}], toConsumableArray(test.hooks("beforeEach")), [function () {
  				test.run();
  			}], toConsumableArray(test.hooks("afterEach").reverse()), toConsumableArray(test.hooks("after").reverse()), [function () {
  				test.after();
  			}, function () {
  				return test.finish();
  			}]);
  		}

  		var previousFailCount = config.storage && +config.storage.getItem("qunit-test-" + this.module.name + "-" + this.testName);

  		// Prioritize previously failed tests, detected from storage
  		var prioritize = config.reorder && !!previousFailCount;

  		this.previousFailure = !!previousFailCount;

  		ProcessingQueue.add(runTest, prioritize, config.seed);

  		// If the queue has already finished, we manually process the new test
  		if (ProcessingQueue.finished) {
  			ProcessingQueue.advance();
  		}
  	},


  	pushResult: function pushResult(resultInfo) {
  		if (this !== config.current) {
  			throw new Error("Assertion occurred after test had finished.");
  		}

  		// Destructure of resultInfo = { result, actual, expected, message, negative }
  		var source,
  		    details = {
  			module: this.module.name,
  			name: this.testName,
  			result: resultInfo.result,
  			message: resultInfo.message,
  			actual: resultInfo.actual,
  			testId: this.testId,
  			negative: resultInfo.negative || false,
  			runtime: now() - this.started,
  			todo: !!this.todo
  		};

  		if (hasOwn.call(resultInfo, "expected")) {
  			details.expected = resultInfo.expected;
  		}

  		if (!resultInfo.result) {
  			source = resultInfo.source || sourceFromStacktrace();

  			if (source) {
  				details.source = source;
  			}
  		}

  		this.logAssertion(details);

  		this.assertions.push({
  			result: !!resultInfo.result,
  			message: resultInfo.message
  		});
  	},

  	pushFailure: function pushFailure(message, source, actual) {
  		if (!(this instanceof Test)) {
  			throw new Error("pushFailure() assertion outside test context, was " + sourceFromStacktrace(2));
  		}

  		this.pushResult({
  			result: false,
  			message: message || "error",
  			actual: actual || null,
  			source: source
  		});
  	},

  	/**
    * Log assertion details using both the old QUnit.log interface and
    * QUnit.on( "assertion" ) interface.
    *
    * @private
    */
  	logAssertion: function logAssertion(details) {
  		runLoggingCallbacks("log", details);

  		var assertion = {
  			passed: details.result,
  			actual: details.actual,
  			expected: details.expected,
  			message: details.message,
  			stack: details.source,
  			todo: details.todo
  		};
  		this.testReport.pushAssertion(assertion);
  		emit("assertion", assertion);
  	},


  	resolvePromise: function resolvePromise(promise, phase) {
  		var then,
  		    resume,
  		    message,
  		    test = this;
  		if (promise != null) {
  			then = promise.then;
  			if (objectType(then) === "function") {
  				resume = internalStop(test);
  				if (config.notrycatch) {
  					then.call(promise, function () {
  						resume();
  					});
  				} else {
  					then.call(promise, function () {
  						resume();
  					}, function (error) {
  						message = "Promise rejected " + (!phase ? "during" : phase.replace(/Each$/, "")) + " \"" + test.testName + "\": " + (error && error.message || error);
  						test.pushFailure(message, extractStacktrace(error, 0));

  						// Else next test will carry the responsibility
  						saveGlobal();

  						// Unblock
  						internalRecover(test);
  					});
  				}
  			}
  		}
  	},

  	valid: function valid() {
  		var filter = config.filter,
  		    regexFilter = /^(!?)\/([\w\W]*)\/(i?$)/.exec(filter),
  		    module = config.module && config.module.toLowerCase(),
  		    fullName = this.module.name + ": " + this.testName;

  		function moduleChainNameMatch(testModule) {
  			var testModuleName = testModule.name ? testModule.name.toLowerCase() : null;
  			if (testModuleName === module) {
  				return true;
  			} else if (testModule.parentModule) {
  				return moduleChainNameMatch(testModule.parentModule);
  			} else {
  				return false;
  			}
  		}

  		function moduleChainIdMatch(testModule) {
  			return inArray(testModule.moduleId, config.moduleId) || testModule.parentModule && moduleChainIdMatch(testModule.parentModule);
  		}

  		// Internally-generated tests are always valid
  		if (this.callback && this.callback.validTest) {
  			return true;
  		}

  		if (config.moduleId && config.moduleId.length > 0 && !moduleChainIdMatch(this.module)) {

  			return false;
  		}

  		if (config.testId && config.testId.length > 0 && !inArray(this.testId, config.testId)) {

  			return false;
  		}

  		if (module && !moduleChainNameMatch(this.module)) {
  			return false;
  		}

  		if (!filter) {
  			return true;
  		}

  		return regexFilter ? this.regexFilter(!!regexFilter[1], regexFilter[2], regexFilter[3], fullName) : this.stringFilter(filter, fullName);
  	},

  	regexFilter: function regexFilter(exclude, pattern, flags, fullName) {
  		var regex = new RegExp(pattern, flags);
  		var match = regex.test(fullName);

  		return match !== exclude;
  	},

  	stringFilter: function stringFilter(filter, fullName) {
  		filter = filter.toLowerCase();
  		fullName = fullName.toLowerCase();

  		var include = filter.charAt(0) !== "!";
  		if (!include) {
  			filter = filter.slice(1);
  		}

  		// If the filter matches, we need to honour include
  		if (fullName.indexOf(filter) !== -1) {
  			return include;
  		}

  		// Otherwise, do the opposite
  		return !include;
  	}
  };

  function pushFailure() {
  	if (!config.current) {
  		throw new Error("pushFailure() assertion outside test context, in " + sourceFromStacktrace(2));
  	}

  	// Gets current test obj
  	var currentTest = config.current;

  	return currentTest.pushFailure.apply(currentTest, arguments);
  }

  function saveGlobal() {
  	config.pollution = [];

  	if (config.noglobals) {
  		for (var key in global$1) {
  			if (hasOwn.call(global$1, key)) {

  				// In Opera sometimes DOM element ids show up here, ignore them
  				if (/^qunit-test-output/.test(key)) {
  					continue;
  				}
  				config.pollution.push(key);
  			}
  		}
  	}
  }

  function checkPollution() {
  	var newGlobals,
  	    deletedGlobals,
  	    old = config.pollution;

  	saveGlobal();

  	newGlobals = diff(config.pollution, old);
  	if (newGlobals.length > 0) {
  		pushFailure("Introduced global variable(s): " + newGlobals.join(", "));
  	}

  	deletedGlobals = diff(old, config.pollution);
  	if (deletedGlobals.length > 0) {
  		pushFailure("Deleted global variable(s): " + deletedGlobals.join(", "));
  	}
  }

  // Will be exposed as QUnit.test
  function test(testName, callback) {
  	if (focused$1) {
  		return;
  	}

  	var newTest = new Test({
  		testName: testName,
  		callback: callback
  	});

  	newTest.queue();
  }

  function todo(testName, callback) {
  	if (focused$1) {
  		return;
  	}

  	var newTest = new Test({
  		testName: testName,
  		callback: callback,
  		todo: true
  	});

  	newTest.queue();
  }

  // Will be exposed as QUnit.skip
  function skip(testName) {
  	if (focused$1) {
  		return;
  	}

  	var test = new Test({
  		testName: testName,
  		skip: true
  	});

  	test.queue();
  }

  // Will be exposed as QUnit.only
  function only(testName, callback) {
  	if (focused$1) {
  		return;
  	}

  	config.queue.length = 0;
  	focused$1 = true;

  	var newTest = new Test({
  		testName: testName,
  		callback: callback
  	});

  	newTest.queue();
  }

  // Put a hold on processing and return a function that will release it.
  function internalStop(test) {
  	var released = false;
  	test.semaphore += 1;
  	config.blocking = true;

  	// Set a recovery timeout, if so configured.
  	if (defined.setTimeout) {
  		var timeoutDuration = void 0;

  		if (typeof test.timeout === "number") {
  			timeoutDuration = test.timeout;
  		} else if (typeof config.testTimeout === "number") {
  			timeoutDuration = config.testTimeout;
  		}

  		if (typeof timeoutDuration === "number" && timeoutDuration > 0) {
  			clearTimeout(config.timeout);
  			config.timeout = setTimeout$1(function () {
  				pushFailure("Test took longer than " + timeoutDuration + "ms; test timed out.", sourceFromStacktrace(2));
  				released = true;
  				internalRecover(test);
  			}, timeoutDuration);
  		}
  	}

  	return function resume() {
  		if (released) {
  			return;
  		}

  		released = true;
  		test.semaphore -= 1;
  		internalStart(test);
  	};
  }

  // Forcefully release all processing holds.
  function internalRecover(test) {
  	test.semaphore = 0;
  	internalStart(test);
  }

  // Release a processing hold, scheduling a resumption attempt if no holds remain.
  function internalStart(test) {

  	// If semaphore is non-numeric, throw error
  	if (isNaN(test.semaphore)) {
  		test.semaphore = 0;

  		pushFailure("Invalid value on test.semaphore", sourceFromStacktrace(2));
  		return;
  	}

  	// Don't start until equal number of stop-calls
  	if (test.semaphore > 0) {
  		return;
  	}

  	// Throw an Error if start is called more often than stop
  	if (test.semaphore < 0) {
  		test.semaphore = 0;

  		pushFailure("Tried to restart test while already started (test's semaphore was 0 already)", sourceFromStacktrace(2));
  		return;
  	}

  	// Add a slight delay to allow more assertions etc.
  	if (defined.setTimeout) {
  		if (config.timeout) {
  			clearTimeout(config.timeout);
  		}
  		config.timeout = setTimeout$1(function () {
  			if (test.semaphore > 0) {
  				return;
  			}

  			if (config.timeout) {
  				clearTimeout(config.timeout);
  			}

  			begin();
  		});
  	} else {
  		begin();
  	}
  }

  function collectTests(module) {
  	var tests = [].concat(module.tests);
  	var modules = [].concat(toConsumableArray(module.childModules));

  	// Do a breadth-first traversal of the child modules
  	while (modules.length) {
  		var nextModule = modules.shift();
  		tests.push.apply(tests, nextModule.tests);
  		modules.push.apply(modules, toConsumableArray(nextModule.childModules));
  	}

  	return tests;
  }

  function numberOfTests(module) {
  	return collectTests(module).length;
  }

  function numberOfUnskippedTests(module) {
  	return collectTests(module).filter(function (test) {
  		return !test.skip;
  	}).length;
  }

  function notifyTestsRan(module, skipped) {
  	module.testsRun++;
  	if (!skipped) {
  		module.unskippedTestsRun++;
  	}
  	while (module = module.parentModule) {
  		module.testsRun++;
  		if (!skipped) {
  			module.unskippedTestsRun++;
  		}
  	}
  }

  var Assert = function () {
  	function Assert(testContext) {
  		classCallCheck(this, Assert);

  		this.test = testContext;
  	}

  	// Assert helpers

  	createClass(Assert, [{
  		key: "timeout",
  		value: function timeout(duration) {
  			if (typeof duration !== "number") {
  				throw new Error("You must pass a number as the duration to assert.timeout");
  			}

  			this.test.timeout = duration;
  		}

  		// Documents a "step", which is a string value, in a test as a passing assertion

  	}, {
  		key: "step",
  		value: function step(message) {
  			var assertionMessage = message;
  			var result = !!message;

  			this.test.steps.push(message);

  			if (objectType(message) === "undefined" || message === "") {
  				assertionMessage = "You must provide a message to assert.step";
  			} else if (objectType(message) !== "string") {
  				assertionMessage = "You must provide a string value to assert.step";
  				result = false;
  			}

  			this.pushResult({
  				result: result,
  				message: assertionMessage
  			});
  		}

  		// Verifies the steps in a test match a given array of string values

  	}, {
  		key: "verifySteps",
  		value: function verifySteps(steps, message) {

  			// Since the steps array is just string values, we can clone with slice
  			var actualStepsClone = this.test.steps.slice();
  			this.deepEqual(actualStepsClone, steps, message);
  			this.test.steps.length = 0;
  		}

  		// Specify the number of expected assertions to guarantee that failed test
  		// (no assertions are run at all) don't slip through.

  	}, {
  		key: "expect",
  		value: function expect(asserts) {
  			if (arguments.length === 1) {
  				this.test.expected = asserts;
  			} else {
  				return this.test.expected;
  			}
  		}

  		// Put a hold on processing and return a function that will release it a maximum of once.

  	}, {
  		key: "async",
  		value: function async(count) {
  			var test$$1 = this.test;

  			var popped = false,
  			    acceptCallCount = count;

  			if (typeof acceptCallCount === "undefined") {
  				acceptCallCount = 1;
  			}

  			var resume = internalStop(test$$1);

  			return function done() {
  				if (config.current !== test$$1) {
  					throw Error("assert.async callback called after test finished.");
  				}

  				if (popped) {
  					test$$1.pushFailure("Too many calls to the `assert.async` callback", sourceFromStacktrace(2));
  					return;
  				}

  				acceptCallCount -= 1;
  				if (acceptCallCount > 0) {
  					return;
  				}

  				popped = true;
  				resume();
  			};
  		}

  		// Exports test.push() to the user API
  		// Alias of pushResult.

  	}, {
  		key: "push",
  		value: function push(result, actual, expected, message, negative) {
  			Logger.warn("assert.push is deprecated and will be removed in QUnit 3.0." + " Please use assert.pushResult instead (https://api.qunitjs.com/assert/pushResult).");

  			var currentAssert = this instanceof Assert ? this : config.current.assert;
  			return currentAssert.pushResult({
  				result: result,
  				actual: actual,
  				expected: expected,
  				message: message,
  				negative: negative
  			});
  		}
  	}, {
  		key: "pushResult",
  		value: function pushResult(resultInfo) {

  			// Destructure of resultInfo = { result, actual, expected, message, negative }
  			var assert = this;
  			var currentTest = assert instanceof Assert && assert.test || config.current;

  			// Backwards compatibility fix.
  			// Allows the direct use of global exported assertions and QUnit.assert.*
  			// Although, it's use is not recommended as it can leak assertions
  			// to other tests from async tests, because we only get a reference to the current test,
  			// not exactly the test where assertion were intended to be called.
  			if (!currentTest) {
  				throw new Error("assertion outside test context, in " + sourceFromStacktrace(2));
  			}

  			if (!(assert instanceof Assert)) {
  				assert = currentTest.assert;
  			}

  			return assert.test.pushResult(resultInfo);
  		}
  	}, {
  		key: "ok",
  		value: function ok(result, message) {
  			if (!message) {
  				message = result ? "okay" : "failed, expected argument to be truthy, was: " + dump.parse(result);
  			}

  			this.pushResult({
  				result: !!result,
  				actual: result,
  				expected: true,
  				message: message
  			});
  		}
  	}, {
  		key: "notOk",
  		value: function notOk(result, message) {
  			if (!message) {
  				message = !result ? "okay" : "failed, expected argument to be falsy, was: " + dump.parse(result);
  			}

  			this.pushResult({
  				result: !result,
  				actual: result,
  				expected: false,
  				message: message
  			});
  		}
  	}, {
  		key: "equal",
  		value: function equal(actual, expected, message) {

  			// eslint-disable-next-line eqeqeq
  			var result = expected == actual;

  			this.pushResult({
  				result: result,
  				actual: actual,
  				expected: expected,
  				message: message
  			});
  		}
  	}, {
  		key: "notEqual",
  		value: function notEqual(actual, expected, message) {

  			// eslint-disable-next-line eqeqeq
  			var result = expected != actual;

  			this.pushResult({
  				result: result,
  				actual: actual,
  				expected: expected,
  				message: message,
  				negative: true
  			});
  		}
  	}, {
  		key: "propEqual",
  		value: function propEqual(actual, expected, message) {
  			actual = objectValues(actual);
  			expected = objectValues(expected);

  			this.pushResult({
  				result: equiv(actual, expected),
  				actual: actual,
  				expected: expected,
  				message: message
  			});
  		}
  	}, {
  		key: "notPropEqual",
  		value: function notPropEqual(actual, expected, message) {
  			actual = objectValues(actual);
  			expected = objectValues(expected);

  			this.pushResult({
  				result: !equiv(actual, expected),
  				actual: actual,
  				expected: expected,
  				message: message,
  				negative: true
  			});
  		}
  	}, {
  		key: "deepEqual",
  		value: function deepEqual(actual, expected, message) {
  			this.pushResult({
  				result: equiv(actual, expected),
  				actual: actual,
  				expected: expected,
  				message: message
  			});
  		}
  	}, {
  		key: "notDeepEqual",
  		value: function notDeepEqual(actual, expected, message) {
  			this.pushResult({
  				result: !equiv(actual, expected),
  				actual: actual,
  				expected: expected,
  				message: message,
  				negative: true
  			});
  		}
  	}, {
  		key: "strictEqual",
  		value: function strictEqual(actual, expected, message) {
  			this.pushResult({
  				result: expected === actual,
  				actual: actual,
  				expected: expected,
  				message: message
  			});
  		}
  	}, {
  		key: "notStrictEqual",
  		value: function notStrictEqual(actual, expected, message) {
  			this.pushResult({
  				result: expected !== actual,
  				actual: actual,
  				expected: expected,
  				message: message,
  				negative: true
  			});
  		}
  	}, {
  		key: "throws",
  		value: function throws(block, expected, message) {
  			var actual = void 0,
  			    result = false;

  			var currentTest = this instanceof Assert && this.test || config.current;

  			// 'expected' is optional unless doing string comparison
  			if (objectType(expected) === "string") {
  				if (message == null) {
  					message = expected;
  					expected = null;
  				} else {
  					throw new Error("throws/raises does not accept a string value for the expected argument.\n" + "Use a non-string object value (e.g. regExp) instead if it's necessary.");
  				}
  			}

  			currentTest.ignoreGlobalErrors = true;
  			try {
  				block.call(currentTest.testEnvironment);
  			} catch (e) {
  				actual = e;
  			}
  			currentTest.ignoreGlobalErrors = false;

  			if (actual) {
  				var expectedType = objectType(expected);

  				// We don't want to validate thrown error
  				if (!expected) {
  					result = true;

  					// Expected is a regexp
  				} else if (expectedType === "regexp") {
  					result = expected.test(errorString(actual));

  					// Log the string form of the regexp
  					expected = String(expected);

  					// Expected is a constructor, maybe an Error constructor
  				} else if (expectedType === "function" && actual instanceof expected) {
  					result = true;

  					// Expected is an Error object
  				} else if (expectedType === "object") {
  					result = actual instanceof expected.constructor && actual.name === expected.name && actual.message === expected.message;

  					// Log the string form of the Error object
  					expected = errorString(expected);

  					// Expected is a validation function which returns true if validation passed
  				} else if (expectedType === "function" && expected.call({}, actual) === true) {
  					expected = null;
  					result = true;
  				}
  			}

  			currentTest.assert.pushResult({
  				result: result,

  				// undefined if it didn't throw
  				actual: actual && errorString(actual),
  				expected: expected,
  				message: message
  			});
  		}
  	}, {
  		key: "rejects",
  		value: function rejects(promise, expected, message) {
  			var result = false;

  			var currentTest = this instanceof Assert && this.test || config.current;

  			// 'expected' is optional unless doing string comparison
  			if (objectType(expected) === "string") {
  				if (message === undefined) {
  					message = expected;
  					expected = undefined;
  				} else {
  					message = "assert.rejects does not accept a string value for the expected " + "argument.\nUse a non-string object value (e.g. validator function) instead " + "if necessary.";

  					currentTest.assert.pushResult({
  						result: false,
  						message: message
  					});

  					return;
  				}
  			}

  			var then = promise && promise.then;
  			if (objectType(then) !== "function") {
  				var _message = "The value provided to `assert.rejects` in " + "\"" + currentTest.testName + "\" was not a promise.";

  				currentTest.assert.pushResult({
  					result: false,
  					message: _message,
  					actual: promise
  				});

  				return;
  			}

  			var done = this.async();

  			return then.call(promise, function handleFulfillment() {
  				var message = "The promise returned by the `assert.rejects` callback in " + "\"" + currentTest.testName + "\" did not reject.";

  				currentTest.assert.pushResult({
  					result: false,
  					message: message,
  					actual: promise
  				});

  				done();
  			}, function handleRejection(actual) {
  				var expectedType = objectType(expected);

  				// We don't want to validate
  				if (expected === undefined) {
  					result = true;

  					// Expected is a regexp
  				} else if (expectedType === "regexp") {
  					result = expected.test(errorString(actual));

  					// Log the string form of the regexp
  					expected = String(expected);

  					// Expected is a constructor, maybe an Error constructor
  				} else if (expectedType === "function" && actual instanceof expected) {
  					result = true;

  					// Expected is an Error object
  				} else if (expectedType === "object") {
  					result = actual instanceof expected.constructor && actual.name === expected.name && actual.message === expected.message;

  					// Log the string form of the Error object
  					expected = errorString(expected);

  					// Expected is a validation function which returns true if validation passed
  				} else {
  					if (expectedType === "function") {
  						result = expected.call({}, actual) === true;
  						expected = null;

  						// Expected is some other invalid type
  					} else {
  						result = false;
  						message = "invalid expected value provided to `assert.rejects` " + "callback in \"" + currentTest.testName + "\": " + expectedType + ".";
  					}
  				}

  				currentTest.assert.pushResult({
  					result: result,

  					// leave rejection value of undefined as-is
  					actual: actual && errorString(actual),
  					expected: expected,
  					message: message
  				});

  				done();
  			});
  		}
  	}]);
  	return Assert;
  }();

  // Provide an alternative to assert.throws(), for environments that consider throws a reserved word
  // Known to us are: Closure Compiler, Narwhal
  // eslint-disable-next-line dot-notation


  Assert.prototype.raises = Assert.prototype["throws"];

  /**
   * Converts an error into a simple string for comparisons.
   *
   * @param {Error|Object} error
   * @return {String}
   */
  function errorString(error) {
  	var resultErrorString = error.toString();

  	// If the error wasn't a subclass of Error but something like
  	// an object literal with name and message properties...
  	if (resultErrorString.substring(0, 7) === "[object") {
  		var name = error.name ? error.name.toString() : "Error";
  		var message = error.message ? error.message.toString() : "";

  		if (name && message) {
  			return name + ": " + message;
  		} else if (name) {
  			return name;
  		} else if (message) {
  			return message;
  		} else {
  			return "Error";
  		}
  	} else {
  		return resultErrorString;
  	}
  }

  /* global module, exports, define */
  function exportQUnit(QUnit) {

  	if (defined.document) {

  		// QUnit may be defined when it is preconfigured but then only QUnit and QUnit.config may be defined.
  		if (window$1.QUnit && window$1.QUnit.version) {
  			throw new Error("QUnit has already been defined.");
  		}

  		window$1.QUnit = QUnit;
  	}

  	// For nodejs
  	if (typeof module !== "undefined" && module && module.exports) {
  		module.exports = QUnit;

  		// For consistency with CommonJS environments' exports
  		module.exports.QUnit = QUnit;
  	}

  	// For CommonJS with exports, but without module.exports, like Rhino
  	if (typeof exports !== "undefined" && exports) {
  		exports.QUnit = QUnit;
  	}

  	if (typeof define === "function" && define.amd) {
  		define(function () {
  			return QUnit;
  		});
  		QUnit.config.autostart = false;
  	}

  	// For Web/Service Workers
  	if (self$1 && self$1.WorkerGlobalScope && self$1 instanceof self$1.WorkerGlobalScope) {
  		self$1.QUnit = QUnit;
  	}
  }

  // Handle an unhandled exception. By convention, returns true if further
  // error handling should be suppressed and false otherwise.
  // In this case, we will only suppress further error handling if the
  // "ignoreGlobalErrors" configuration option is enabled.
  function onError(error) {
  	for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
  		args[_key - 1] = arguments[_key];
  	}

  	if (config.current) {
  		if (config.current.ignoreGlobalErrors) {
  			return true;
  		}
  		pushFailure.apply(undefined, [error.message, error.stacktrace || error.fileName + ":" + error.lineNumber].concat(args));
  	} else {
  		test("global failure", extend(function () {
  			pushFailure.apply(undefined, [error.message, error.stacktrace || error.fileName + ":" + error.lineNumber].concat(args));
  		}, { validTest: true }));
  	}

  	return false;
  }

  // Handle an unhandled rejection
  function onUnhandledRejection(reason) {
  	var resultInfo = {
  		result: false,
  		message: reason.message || "error",
  		actual: reason,
  		source: reason.stack || sourceFromStacktrace(3)
  	};

  	var currentTest = config.current;
  	if (currentTest) {
  		currentTest.assert.pushResult(resultInfo);
  	} else {
  		test("global failure", extend(function (assert) {
  			assert.pushResult(resultInfo);
  		}, { validTest: true }));
  	}
  }

  var QUnit = {};
  var globalSuite = new SuiteReport();

  // The initial "currentModule" represents the global (or top-level) module that
  // is not explicitly defined by the user, therefore we add the "globalSuite" to
  // it since each module has a suiteReport associated with it.
  config.currentModule.suiteReport = globalSuite;

  var globalStartCalled = false;
  var runStarted = false;

  // Figure out if we're running the tests from a server or not
  QUnit.isLocal = !(defined.document && window$1.location.protocol !== "file:");

  // Expose the current QUnit version
  QUnit.version = "2.9.2";

  extend(QUnit, {
  	on: on,

  	module: module$1,

  	test: test,

  	todo: todo,

  	skip: skip,

  	only: only,

  	start: function start(count) {
  		var globalStartAlreadyCalled = globalStartCalled;

  		if (!config.current) {
  			globalStartCalled = true;

  			if (runStarted) {
  				throw new Error("Called start() while test already started running");
  			} else if (globalStartAlreadyCalled || count > 1) {
  				throw new Error("Called start() outside of a test context too many times");
  			} else if (config.autostart) {
  				throw new Error("Called start() outside of a test context when " + "QUnit.config.autostart was true");
  			} else if (!config.pageLoaded) {

  				// The page isn't completely loaded yet, so we set autostart and then
  				// load if we're in Node or wait for the browser's load event.
  				config.autostart = true;

  				// Starts from Node even if .load was not previously called. We still return
  				// early otherwise we'll wind up "beginning" twice.
  				if (!defined.document) {
  					QUnit.load();
  				}

  				return;
  			}
  		} else {
  			throw new Error("QUnit.start cannot be called inside a test context.");
  		}

  		scheduleBegin();
  	},

  	config: config,

  	is: is,

  	objectType: objectType,

  	extend: extend,

  	load: function load() {
  		config.pageLoaded = true;

  		// Initialize the configuration options
  		extend(config, {
  			stats: { all: 0, bad: 0 },
  			started: 0,
  			updateRate: 1000,
  			autostart: true,
  			filter: ""
  		}, true);

  		if (!runStarted) {
  			config.blocking = false;

  			if (config.autostart) {
  				scheduleBegin();
  			}
  		}
  	},

  	stack: function stack(offset) {
  		offset = (offset || 0) + 2;
  		return sourceFromStacktrace(offset);
  	},

  	onError: onError,

  	onUnhandledRejection: onUnhandledRejection
  });

  QUnit.pushFailure = pushFailure;
  QUnit.assert = Assert.prototype;
  QUnit.equiv = equiv;
  QUnit.dump = dump;

  registerLoggingCallbacks(QUnit);

  function scheduleBegin() {

  	runStarted = true;

  	// Add a slight delay to allow definition of more modules and tests.
  	if (defined.setTimeout) {
  		setTimeout$1(function () {
  			begin();
  		});
  	} else {
  		begin();
  	}
  }

  function unblockAndAdvanceQueue() {
  	config.blocking = false;
  	ProcessingQueue.advance();
  }

  function begin() {
  	var i,
  	    l,
  	    modulesLog = [];

  	// If the test run hasn't officially begun yet
  	if (!config.started) {

  		// Record the time of the test run's beginning
  		config.started = now();

  		// Delete the loose unnamed module if unused.
  		if (config.modules[0].name === "" && config.modules[0].tests.length === 0) {
  			config.modules.shift();
  		}

  		// Avoid unnecessary information by not logging modules' test environments
  		for (i = 0, l = config.modules.length; i < l; i++) {
  			modulesLog.push({
  				name: config.modules[i].name,
  				tests: config.modules[i].tests
  			});
  		}

  		// The test run is officially beginning now
  		emit("runStart", globalSuite.start(true));
  		runLoggingCallbacks("begin", {
  			totalTests: Test.count,
  			modules: modulesLog
  		}).then(unblockAndAdvanceQueue);
  	} else {
  		unblockAndAdvanceQueue();
  	}
  }

  exportQUnit(QUnit);

  (function () {

  	if (typeof window$1 === "undefined" || typeof document$1 === "undefined") {
  		return;
  	}

  	var config = QUnit.config,
  	    hasOwn = Object.prototype.hasOwnProperty;

  	// Stores fixture HTML for resetting later
  	function storeFixture() {

  		// Avoid overwriting user-defined values
  		if (hasOwn.call(config, "fixture")) {
  			return;
  		}

  		var fixture = document$1.getElementById("qunit-fixture");
  		if (fixture) {
  			config.fixture = fixture.cloneNode(true);
  		}
  	}

  	QUnit.begin(storeFixture);

  	// Resets the fixture DOM element if available.
  	function resetFixture() {
  		if (config.fixture == null) {
  			return;
  		}

  		var fixture = document$1.getElementById("qunit-fixture");
  		var resetFixtureType = _typeof(config.fixture);
  		if (resetFixtureType === "string") {

  			// support user defined values for `config.fixture`
  			var newFixture = document$1.createElement("div");
  			newFixture.setAttribute("id", "qunit-fixture");
  			newFixture.innerHTML = config.fixture;
  			fixture.parentNode.replaceChild(newFixture, fixture);
  		} else {
  			var clonedFixture = config.fixture.cloneNode(true);
  			fixture.parentNode.replaceChild(clonedFixture, fixture);
  		}
  	}

  	QUnit.testStart(resetFixture);
  })();

  (function () {

  	// Only interact with URLs via window.location
  	var location = typeof window$1 !== "undefined" && window$1.location;
  	if (!location) {
  		return;
  	}

  	var urlParams = getUrlParams();

  	QUnit.urlParams = urlParams;

  	// Match module/test by inclusion in an array
  	QUnit.config.moduleId = [].concat(urlParams.moduleId || []);
  	QUnit.config.testId = [].concat(urlParams.testId || []);

  	// Exact case-insensitive match of the module name
  	QUnit.config.module = urlParams.module;

  	// Regular expression or case-insenstive substring match against "moduleName: testName"
  	QUnit.config.filter = urlParams.filter;

  	// Test order randomization
  	if (urlParams.seed === true) {

  		// Generate a random seed if the option is specified without a value
  		QUnit.config.seed = Math.random().toString(36).slice(2);
  	} else if (urlParams.seed) {
  		QUnit.config.seed = urlParams.seed;
  	}

  	// Add URL-parameter-mapped config values with UI form rendering data
  	QUnit.config.urlConfig.push({
  		id: "hidepassed",
  		label: "Hide passed tests",
  		tooltip: "Only show tests and assertions that fail. Stored as query-strings."
  	}, {
  		id: "noglobals",
  		label: "Check for Globals",
  		tooltip: "Enabling this will test if any test introduces new properties on the " + "global object (`window` in Browsers). Stored as query-strings."
  	}, {
  		id: "notrycatch",
  		label: "No try-catch",
  		tooltip: "Enabling this will run tests outside of a try-catch block. Makes debugging " + "exceptions in IE reasonable. Stored as query-strings."
  	});

  	QUnit.begin(function () {
  		var i,
  		    option,
  		    urlConfig = QUnit.config.urlConfig;

  		for (i = 0; i < urlConfig.length; i++) {

  			// Options can be either strings or objects with nonempty "id" properties
  			option = QUnit.config.urlConfig[i];
  			if (typeof option !== "string") {
  				option = option.id;
  			}

  			if (QUnit.config[option] === undefined) {
  				QUnit.config[option] = urlParams[option];
  			}
  		}
  	});

  	function getUrlParams() {
  		var i, param, name, value;
  		var urlParams = Object.create(null);
  		var params = location.search.slice(1).split("&");
  		var length = params.length;

  		for (i = 0; i < length; i++) {
  			if (params[i]) {
  				param = params[i].split("=");
  				name = decodeQueryParam(param[0]);

  				// Allow just a key to turn on a flag, e.g., test.html?noglobals
  				value = param.length === 1 || decodeQueryParam(param.slice(1).join("="));
  				if (name in urlParams) {
  					urlParams[name] = [].concat(urlParams[name], value);
  				} else {
  					urlParams[name] = value;
  				}
  			}
  		}

  		return urlParams;
  	}

  	function decodeQueryParam(param) {
  		return decodeURIComponent(param.replace(/\+/g, "%20"));
  	}
  })();

  var stats = {
  	passedTests: 0,
  	failedTests: 0,
  	skippedTests: 0,
  	todoTests: 0
  };

  // Escape text for attribute or text content.
  function escapeText(s) {
  	if (!s) {
  		return "";
  	}
  	s = s + "";

  	// Both single quotes and double quotes (for attributes)
  	return s.replace(/['"<>&]/g, function (s) {
  		switch (s) {
  			case "'":
  				return "&#039;";
  			case "\"":
  				return "&quot;";
  			case "<":
  				return "&lt;";
  			case ">":
  				return "&gt;";
  			case "&":
  				return "&amp;";
  		}
  	});
  }

  (function () {

  	// Don't load the HTML Reporter on non-browser environments
  	if (typeof window$1 === "undefined" || !window$1.document) {
  		return;
  	}

  	var config = QUnit.config,
  	    hiddenTests = [],
  	    document = window$1.document,
  	    collapseNext = false,
  	    hasOwn = Object.prototype.hasOwnProperty,
  	    unfilteredUrl = setUrl({ filter: undefined, module: undefined,
  		moduleId: undefined, testId: undefined }),
  	    modulesList = [];

  	function addEvent(elem, type, fn) {
  		elem.addEventListener(type, fn, false);
  	}

  	function removeEvent(elem, type, fn) {
  		elem.removeEventListener(type, fn, false);
  	}

  	function addEvents(elems, type, fn) {
  		var i = elems.length;
  		while (i--) {
  			addEvent(elems[i], type, fn);
  		}
  	}

  	function hasClass(elem, name) {
  		return (" " + elem.className + " ").indexOf(" " + name + " ") >= 0;
  	}

  	function addClass(elem, name) {
  		if (!hasClass(elem, name)) {
  			elem.className += (elem.className ? " " : "") + name;
  		}
  	}

  	function toggleClass(elem, name, force) {
  		if (force || typeof force === "undefined" && !hasClass(elem, name)) {
  			addClass(elem, name);
  		} else {
  			removeClass(elem, name);
  		}
  	}

  	function removeClass(elem, name) {
  		var set = " " + elem.className + " ";

  		// Class name may appear multiple times
  		while (set.indexOf(" " + name + " ") >= 0) {
  			set = set.replace(" " + name + " ", " ");
  		}

  		// Trim for prettiness
  		elem.className = typeof set.trim === "function" ? set.trim() : set.replace(/^\s+|\s+$/g, "");
  	}

  	function id(name) {
  		return document.getElementById && document.getElementById(name);
  	}

  	function abortTests() {
  		var abortButton = id("qunit-abort-tests-button");
  		if (abortButton) {
  			abortButton.disabled = true;
  			abortButton.innerHTML = "Aborting...";
  		}
  		QUnit.config.queue.length = 0;
  		return false;
  	}

  	function interceptNavigation(ev) {
  		applyUrlParams();

  		if (ev && ev.preventDefault) {
  			ev.preventDefault();
  		}

  		return false;
  	}

  	function getUrlConfigHtml() {
  		var i,
  		    j,
  		    val,
  		    escaped,
  		    escapedTooltip,
  		    selection = false,
  		    urlConfig = config.urlConfig,
  		    urlConfigHtml = "";

  		for (i = 0; i < urlConfig.length; i++) {

  			// Options can be either strings or objects with nonempty "id" properties
  			val = config.urlConfig[i];
  			if (typeof val === "string") {
  				val = {
  					id: val,
  					label: val
  				};
  			}

  			escaped = escapeText(val.id);
  			escapedTooltip = escapeText(val.tooltip);

  			if (!val.value || typeof val.value === "string") {
  				urlConfigHtml += "<label for='qunit-urlconfig-" + escaped + "' title='" + escapedTooltip + "'><input id='qunit-urlconfig-" + escaped + "' name='" + escaped + "' type='checkbox'" + (val.value ? " value='" + escapeText(val.value) + "'" : "") + (config[val.id] ? " checked='checked'" : "") + " title='" + escapedTooltip + "' />" + escapeText(val.label) + "</label>";
  			} else {
  				urlConfigHtml += "<label for='qunit-urlconfig-" + escaped + "' title='" + escapedTooltip + "'>" + val.label + ": </label><select id='qunit-urlconfig-" + escaped + "' name='" + escaped + "' title='" + escapedTooltip + "'><option></option>";

  				if (QUnit.is("array", val.value)) {
  					for (j = 0; j < val.value.length; j++) {
  						escaped = escapeText(val.value[j]);
  						urlConfigHtml += "<option value='" + escaped + "'" + (config[val.id] === val.value[j] ? (selection = true) && " selected='selected'" : "") + ">" + escaped + "</option>";
  					}
  				} else {
  					for (j in val.value) {
  						if (hasOwn.call(val.value, j)) {
  							urlConfigHtml += "<option value='" + escapeText(j) + "'" + (config[val.id] === j ? (selection = true) && " selected='selected'" : "") + ">" + escapeText(val.value[j]) + "</option>";
  						}
  					}
  				}
  				if (config[val.id] && !selection) {
  					escaped = escapeText(config[val.id]);
  					urlConfigHtml += "<option value='" + escaped + "' selected='selected' disabled='disabled'>" + escaped + "</option>";
  				}
  				urlConfigHtml += "</select>";
  			}
  		}

  		return urlConfigHtml;
  	}

  	// Handle "click" events on toolbar checkboxes and "change" for select menus.
  	// Updates the URL with the new state of `config.urlConfig` values.
  	function toolbarChanged() {
  		var updatedUrl,
  		    value,
  		    tests,
  		    field = this,
  		    params = {};

  		// Detect if field is a select menu or a checkbox
  		if ("selectedIndex" in field) {
  			value = field.options[field.selectedIndex].value || undefined;
  		} else {
  			value = field.checked ? field.defaultValue || true : undefined;
  		}

  		params[field.name] = value;
  		updatedUrl = setUrl(params);

  		// Check if we can apply the change without a page refresh
  		if ("hidepassed" === field.name && "replaceState" in window$1.history) {
  			QUnit.urlParams[field.name] = value;
  			config[field.name] = value || false;
  			tests = id("qunit-tests");
  			if (tests) {
  				var length = tests.children.length;
  				var children = tests.children;

  				if (field.checked) {
  					for (var i = 0; i < length; i++) {
  						var test = children[i];

  						if (test && test.className.indexOf("pass") > -1) {
  							hiddenTests.push(test);
  						}
  					}

  					var _iteratorNormalCompletion = true;
  					var _didIteratorError = false;
  					var _iteratorError = undefined;

  					try {
  						for (var _iterator = hiddenTests[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
  							var hiddenTest = _step.value;

  							tests.removeChild(hiddenTest);
  						}
  					} catch (err) {
  						_didIteratorError = true;
  						_iteratorError = err;
  					} finally {
  						try {
  							if (!_iteratorNormalCompletion && _iterator.return) {
  								_iterator.return();
  							}
  						} finally {
  							if (_didIteratorError) {
  								throw _iteratorError;
  							}
  						}
  					}
  				} else {
  					while ((test = hiddenTests.pop()) != null) {
  						tests.appendChild(test);
  					}
  				}
  			}
  			window$1.history.replaceState(null, "", updatedUrl);
  		} else {
  			window$1.location = updatedUrl;
  		}
  	}

  	function setUrl(params) {
  		var key,
  		    arrValue,
  		    i,
  		    querystring = "?",
  		    location = window$1.location;

  		params = QUnit.extend(QUnit.extend({}, QUnit.urlParams), params);

  		for (key in params) {

  			// Skip inherited or undefined properties
  			if (hasOwn.call(params, key) && params[key] !== undefined) {

  				// Output a parameter for each value of this key
  				// (but usually just one)
  				arrValue = [].concat(params[key]);
  				for (i = 0; i < arrValue.length; i++) {
  					querystring += encodeURIComponent(key);
  					if (arrValue[i] !== true) {
  						querystring += "=" + encodeURIComponent(arrValue[i]);
  					}
  					querystring += "&";
  				}
  			}
  		}
  		return location.protocol + "//" + location.host + location.pathname + querystring.slice(0, -1);
  	}

  	function applyUrlParams() {
  		var i,
  		    selectedModules = [],
  		    modulesList = id("qunit-modulefilter-dropdown-list").getElementsByTagName("input"),
  		    filter = id("qunit-filter-input").value;

  		for (i = 0; i < modulesList.length; i++) {
  			if (modulesList[i].checked) {
  				selectedModules.push(modulesList[i].value);
  			}
  		}

  		window$1.location = setUrl({
  			filter: filter === "" ? undefined : filter,
  			moduleId: selectedModules.length === 0 ? undefined : selectedModules,

  			// Remove module and testId filter
  			module: undefined,
  			testId: undefined
  		});
  	}

  	function toolbarUrlConfigContainer() {
  		var urlConfigContainer = document.createElement("span");

  		urlConfigContainer.innerHTML = getUrlConfigHtml();
  		addClass(urlConfigContainer, "qunit-url-config");

  		addEvents(urlConfigContainer.getElementsByTagName("input"), "change", toolbarChanged);
  		addEvents(urlConfigContainer.getElementsByTagName("select"), "change", toolbarChanged);

  		return urlConfigContainer;
  	}

  	function abortTestsButton() {
  		var button = document.createElement("button");
  		button.id = "qunit-abort-tests-button";
  		button.innerHTML = "Abort";
  		addEvent(button, "click", abortTests);
  		return button;
  	}

  	function toolbarLooseFilter() {
  		var filter = document.createElement("form"),
  		    label = document.createElement("label"),
  		    input = document.createElement("input"),
  		    button = document.createElement("button");

  		addClass(filter, "qunit-filter");

  		label.innerHTML = "Filter: ";

  		input.type = "text";
  		input.value = config.filter || "";
  		input.name = "filter";
  		input.id = "qunit-filter-input";

  		button.innerHTML = "Go";

  		label.appendChild(input);

  		filter.appendChild(label);
  		filter.appendChild(document.createTextNode(" "));
  		filter.appendChild(button);
  		addEvent(filter, "submit", interceptNavigation);

  		return filter;
  	}

  	function moduleListHtml() {
  		var i,
  		    checked,
  		    html = "";

  		for (i = 0; i < config.modules.length; i++) {
  			if (config.modules[i].name !== "") {
  				checked = config.moduleId.indexOf(config.modules[i].moduleId) > -1;
  				html += "<li><label class='clickable" + (checked ? " checked" : "") + "'><input type='checkbox' " + "value='" + config.modules[i].moduleId + "'" + (checked ? " checked='checked'" : "") + " />" + escapeText(config.modules[i].name) + "</label></li>";
  			}
  		}

  		return html;
  	}

  	function toolbarModuleFilter() {
  		var commit,
  		    reset,
  		    moduleFilter = document.createElement("form"),
  		    label = document.createElement("label"),
  		    moduleSearch = document.createElement("input"),
  		    dropDown = document.createElement("div"),
  		    actions = document.createElement("span"),
  		    applyButton = document.createElement("button"),
  		    resetButton = document.createElement("button"),
  		    allModulesLabel = document.createElement("label"),
  		    allCheckbox = document.createElement("input"),
  		    dropDownList = document.createElement("ul"),
  		    dirty = false;

  		moduleSearch.id = "qunit-modulefilter-search";
  		moduleSearch.autocomplete = "off";
  		addEvent(moduleSearch, "input", searchInput);
  		addEvent(moduleSearch, "input", searchFocus);
  		addEvent(moduleSearch, "focus", searchFocus);
  		addEvent(moduleSearch, "click", searchFocus);

  		label.id = "qunit-modulefilter-search-container";
  		label.innerHTML = "Module: ";
  		label.appendChild(moduleSearch);

  		applyButton.textContent = "Apply";
  		applyButton.style.display = "none";

  		resetButton.textContent = "Reset";
  		resetButton.type = "reset";
  		resetButton.style.display = "none";

  		allCheckbox.type = "checkbox";
  		allCheckbox.checked = config.moduleId.length === 0;

  		allModulesLabel.className = "clickable";
  		if (config.moduleId.length) {
  			allModulesLabel.className = "checked";
  		}
  		allModulesLabel.appendChild(allCheckbox);
  		allModulesLabel.appendChild(document.createTextNode("All modules"));

  		actions.id = "qunit-modulefilter-actions";
  		actions.appendChild(applyButton);
  		actions.appendChild(resetButton);
  		actions.appendChild(allModulesLabel);
  		commit = actions.firstChild;
  		reset = commit.nextSibling;
  		addEvent(commit, "click", applyUrlParams);

  		dropDownList.id = "qunit-modulefilter-dropdown-list";
  		dropDownList.innerHTML = moduleListHtml();

  		dropDown.id = "qunit-modulefilter-dropdown";
  		dropDown.style.display = "none";
  		dropDown.appendChild(actions);
  		dropDown.appendChild(dropDownList);
  		addEvent(dropDown, "change", selectionChange);
  		selectionChange();

  		moduleFilter.id = "qunit-modulefilter";
  		moduleFilter.appendChild(label);
  		moduleFilter.appendChild(dropDown);
  		addEvent(moduleFilter, "submit", interceptNavigation);
  		addEvent(moduleFilter, "reset", function () {

  			// Let the reset happen, then update styles
  			window$1.setTimeout(selectionChange);
  		});

  		// Enables show/hide for the dropdown
  		function searchFocus() {
  			if (dropDown.style.display !== "none") {
  				return;
  			}

  			dropDown.style.display = "block";
  			addEvent(document, "click", hideHandler);
  			addEvent(document, "keydown", hideHandler);

  			// Hide on Escape keydown or outside-container click
  			function hideHandler(e) {
  				var inContainer = moduleFilter.contains(e.target);

  				if (e.keyCode === 27 || !inContainer) {
  					if (e.keyCode === 27 && inContainer) {
  						moduleSearch.focus();
  					}
  					dropDown.style.display = "none";
  					removeEvent(document, "click", hideHandler);
  					removeEvent(document, "keydown", hideHandler);
  					moduleSearch.value = "";
  					searchInput();
  				}
  			}
  		}

  		// Processes module search box input
  		function searchInput() {
  			var i,
  			    item,
  			    searchText = moduleSearch.value.toLowerCase(),
  			    listItems = dropDownList.children;

  			for (i = 0; i < listItems.length; i++) {
  				item = listItems[i];
  				if (!searchText || item.textContent.toLowerCase().indexOf(searchText) > -1) {
  					item.style.display = "";
  				} else {
  					item.style.display = "none";
  				}
  			}
  		}

  		// Processes selection changes
  		function selectionChange(evt) {
  			var i,
  			    item,
  			    checkbox = evt && evt.target || allCheckbox,
  			    modulesList = dropDownList.getElementsByTagName("input"),
  			    selectedNames = [];

  			toggleClass(checkbox.parentNode, "checked", checkbox.checked);

  			dirty = false;
  			if (checkbox.checked && checkbox !== allCheckbox) {
  				allCheckbox.checked = false;
  				removeClass(allCheckbox.parentNode, "checked");
  			}
  			for (i = 0; i < modulesList.length; i++) {
  				item = modulesList[i];
  				if (!evt) {
  					toggleClass(item.parentNode, "checked", item.checked);
  				} else if (checkbox === allCheckbox && checkbox.checked) {
  					item.checked = false;
  					removeClass(item.parentNode, "checked");
  				}
  				dirty = dirty || item.checked !== item.defaultChecked;
  				if (item.checked) {
  					selectedNames.push(item.parentNode.textContent);
  				}
  			}

  			commit.style.display = reset.style.display = dirty ? "" : "none";
  			moduleSearch.placeholder = selectedNames.join(", ") || allCheckbox.parentNode.textContent;
  			moduleSearch.title = "Type to filter list. Current selection:\n" + (selectedNames.join("\n") || allCheckbox.parentNode.textContent);
  		}

  		return moduleFilter;
  	}

  	function appendToolbar() {
  		var toolbar = id("qunit-testrunner-toolbar");

  		if (toolbar) {
  			toolbar.appendChild(toolbarUrlConfigContainer());
  			toolbar.appendChild(toolbarModuleFilter());
  			toolbar.appendChild(toolbarLooseFilter());
  			toolbar.appendChild(document.createElement("div")).className = "clearfix";
  		}
  	}

  	function appendHeader() {
  		var header = id("qunit-header");

  		if (header) {
  			header.innerHTML = "<a href='" + escapeText(unfilteredUrl) + "'>" + header.innerHTML + "</a> ";
  		}
  	}

  	function appendBanner() {
  		var banner = id("qunit-banner");

  		if (banner) {
  			banner.className = "";
  		}
  	}

  	function appendTestResults() {
  		var tests = id("qunit-tests"),
  		    result = id("qunit-testresult"),
  		    controls;

  		if (result) {
  			result.parentNode.removeChild(result);
  		}

  		if (tests) {
  			tests.innerHTML = "";
  			result = document.createElement("p");
  			result.id = "qunit-testresult";
  			result.className = "result";
  			tests.parentNode.insertBefore(result, tests);
  			result.innerHTML = "<div id=\"qunit-testresult-display\">Running...<br />&#160;</div>" + "<div id=\"qunit-testresult-controls\"></div>" + "<div class=\"clearfix\"></div>";
  			controls = id("qunit-testresult-controls");
  		}

  		if (controls) {
  			controls.appendChild(abortTestsButton());
  		}
  	}

  	function appendFilteredTest() {
  		var testId = QUnit.config.testId;
  		if (!testId || testId.length <= 0) {
  			return "";
  		}
  		return "<div id='qunit-filteredTest'>Rerunning selected tests: " + escapeText(testId.join(", ")) + " <a id='qunit-clearFilter' href='" + escapeText(unfilteredUrl) + "'>Run all tests</a></div>";
  	}

  	function appendUserAgent() {
  		var userAgent = id("qunit-userAgent");

  		if (userAgent) {
  			userAgent.innerHTML = "";
  			userAgent.appendChild(document.createTextNode("QUnit " + QUnit.version + "; " + navigator.userAgent));
  		}
  	}

  	function appendInterface() {
  		var qunit = id("qunit");

  		if (qunit) {
  			qunit.innerHTML = "<h1 id='qunit-header'>" + escapeText(document.title) + "</h1>" + "<h2 id='qunit-banner'></h2>" + "<div id='qunit-testrunner-toolbar'></div>" + appendFilteredTest() + "<h2 id='qunit-userAgent'></h2>" + "<ol id='qunit-tests'></ol>";
  		}

  		appendHeader();
  		appendBanner();
  		appendTestResults();
  		appendUserAgent();
  		appendToolbar();
  	}

  	function appendTest(name, testId, moduleName) {
  		var title,
  		    rerunTrigger,
  		    testBlock,
  		    assertList,
  		    tests = id("qunit-tests");

  		if (!tests) {
  			return;
  		}

  		title = document.createElement("strong");
  		title.innerHTML = getNameHtml(name, moduleName);

  		rerunTrigger = document.createElement("a");
  		rerunTrigger.innerHTML = "Rerun";
  		rerunTrigger.href = setUrl({ testId: testId });

  		testBlock = document.createElement("li");
  		testBlock.appendChild(title);
  		testBlock.appendChild(rerunTrigger);
  		testBlock.id = "qunit-test-output-" + testId;

  		assertList = document.createElement("ol");
  		assertList.className = "qunit-assert-list";

  		testBlock.appendChild(assertList);

  		tests.appendChild(testBlock);
  	}

  	// HTML Reporter initialization and load
  	QUnit.begin(function (details) {
  		var i, moduleObj;

  		// Sort modules by name for the picker
  		for (i = 0; i < details.modules.length; i++) {
  			moduleObj = details.modules[i];
  			if (moduleObj.name) {
  				modulesList.push(moduleObj.name);
  			}
  		}
  		modulesList.sort(function (a, b) {
  			return a.localeCompare(b);
  		});

  		// Initialize QUnit elements
  		appendInterface();
  	});

  	QUnit.done(function (details) {
  		var banner = id("qunit-banner"),
  		    tests = id("qunit-tests"),
  		    abortButton = id("qunit-abort-tests-button"),
  		    totalTests = stats.passedTests + stats.skippedTests + stats.todoTests + stats.failedTests,
  		    html = [totalTests, " tests completed in ", details.runtime, " milliseconds, with ", stats.failedTests, " failed, ", stats.skippedTests, " skipped, and ", stats.todoTests, " todo.<br />", "<span class='passed'>", details.passed, "</span> assertions of <span class='total'>", details.total, "</span> passed, <span class='failed'>", details.failed, "</span> failed."].join(""),
  		    test,
  		    assertLi,
  		    assertList;

  		// Update remaing tests to aborted
  		if (abortButton && abortButton.disabled) {
  			html = "Tests aborted after " + details.runtime + " milliseconds.";

  			for (var i = 0; i < tests.children.length; i++) {
  				test = tests.children[i];
  				if (test.className === "" || test.className === "running") {
  					test.className = "aborted";
  					assertList = test.getElementsByTagName("ol")[0];
  					assertLi = document.createElement("li");
  					assertLi.className = "fail";
  					assertLi.innerHTML = "Test aborted.";
  					assertList.appendChild(assertLi);
  				}
  			}
  		}

  		if (banner && (!abortButton || abortButton.disabled === false)) {
  			banner.className = stats.failedTests ? "qunit-fail" : "qunit-pass";
  		}

  		if (abortButton) {
  			abortButton.parentNode.removeChild(abortButton);
  		}

  		if (tests) {
  			id("qunit-testresult-display").innerHTML = html;
  		}

  		if (config.altertitle && document.title) {

  			// Show ✖ for good, ✔ for bad suite result in title
  			// use escape sequences in case file gets loaded with non-utf-8
  			// charset
  			document.title = [stats.failedTests ? "\u2716" : "\u2714", document.title.replace(/^[\u2714\u2716] /i, "")].join(" ");
  		}

  		// Scroll back to top to show results
  		if (config.scrolltop && window$1.scrollTo) {
  			window$1.scrollTo(0, 0);
  		}
  	});

  	function getNameHtml(name, module) {
  		var nameHtml = "";

  		if (module) {
  			nameHtml = "<span class='module-name'>" + escapeText(module) + "</span>: ";
  		}

  		nameHtml += "<span class='test-name'>" + escapeText(name) + "</span>";

  		return nameHtml;
  	}

  	QUnit.testStart(function (details) {
  		var running, bad;

  		appendTest(details.name, details.testId, details.module);

  		running = id("qunit-testresult-display");

  		if (running) {
  			addClass(running, "running");

  			bad = QUnit.config.reorder && details.previousFailure;

  			running.innerHTML = [bad ? "Rerunning previously failed test: <br />" : "Running: <br />", getNameHtml(details.name, details.module)].join("");
  		}
  	});

  	function stripHtml(string) {

  		// Strip tags, html entity and whitespaces
  		return string.replace(/<\/?[^>]+(>|$)/g, "").replace(/&quot;/g, "").replace(/\s+/g, "");
  	}

  	QUnit.log(function (details) {
  		var assertList,
  		    assertLi,
  		    message,
  		    expected,
  		    actual,
  		    diff,
  		    showDiff = false,
  		    testItem = id("qunit-test-output-" + details.testId);

  		if (!testItem) {
  			return;
  		}

  		message = escapeText(details.message) || (details.result ? "okay" : "failed");
  		message = "<span class='test-message'>" + message + "</span>";
  		message += "<span class='runtime'>@ " + details.runtime + " ms</span>";

  		// The pushFailure doesn't provide details.expected
  		// when it calls, it's implicit to also not show expected and diff stuff
  		// Also, we need to check details.expected existence, as it can exist and be undefined
  		if (!details.result && hasOwn.call(details, "expected")) {
  			if (details.negative) {
  				expected = "NOT " + QUnit.dump.parse(details.expected);
  			} else {
  				expected = QUnit.dump.parse(details.expected);
  			}

  			actual = QUnit.dump.parse(details.actual);
  			message += "<table><tr class='test-expected'><th>Expected: </th><td><pre>" + escapeText(expected) + "</pre></td></tr>";

  			if (actual !== expected) {

  				message += "<tr class='test-actual'><th>Result: </th><td><pre>" + escapeText(actual) + "</pre></td></tr>";

  				if (typeof details.actual === "number" && typeof details.expected === "number") {
  					if (!isNaN(details.actual) && !isNaN(details.expected)) {
  						showDiff = true;
  						diff = details.actual - details.expected;
  						diff = (diff > 0 ? "+" : "") + diff;
  					}
  				} else if (typeof details.actual !== "boolean" && typeof details.expected !== "boolean") {
  					diff = QUnit.diff(expected, actual);

  					// don't show diff if there is zero overlap
  					showDiff = stripHtml(diff).length !== stripHtml(expected).length + stripHtml(actual).length;
  				}

  				if (showDiff) {
  					message += "<tr class='test-diff'><th>Diff: </th><td><pre>" + diff + "</pre></td></tr>";
  				}
  			} else if (expected.indexOf("[object Array]") !== -1 || expected.indexOf("[object Object]") !== -1) {
  				message += "<tr class='test-message'><th>Message: </th><td>" + "Diff suppressed as the depth of object is more than current max depth (" + QUnit.config.maxDepth + ").<p>Hint: Use <code>QUnit.dump.maxDepth</code> to " + " run with a higher max depth or <a href='" + escapeText(setUrl({ maxDepth: -1 })) + "'>" + "Rerun</a> without max depth.</p></td></tr>";
  			} else {
  				message += "<tr class='test-message'><th>Message: </th><td>" + "Diff suppressed as the expected and actual results have an equivalent" + " serialization</td></tr>";
  			}

  			if (details.source) {
  				message += "<tr class='test-source'><th>Source: </th><td><pre>" + escapeText(details.source) + "</pre></td></tr>";
  			}

  			message += "</table>";

  			// This occurs when pushFailure is set and we have an extracted stack trace
  		} else if (!details.result && details.source) {
  			message += "<table>" + "<tr class='test-source'><th>Source: </th><td><pre>" + escapeText(details.source) + "</pre></td></tr>" + "</table>";
  		}

  		assertList = testItem.getElementsByTagName("ol")[0];

  		assertLi = document.createElement("li");
  		assertLi.className = details.result ? "pass" : "fail";
  		assertLi.innerHTML = message;
  		assertList.appendChild(assertLi);
  	});

  	QUnit.testDone(function (details) {
  		var testTitle,
  		    time,
  		    testItem,
  		    assertList,
  		    status,
  		    good,
  		    bad,
  		    testCounts,
  		    skipped,
  		    sourceName,
  		    tests = id("qunit-tests");

  		if (!tests) {
  			return;
  		}

  		testItem = id("qunit-test-output-" + details.testId);

  		removeClass(testItem, "running");

  		if (details.failed > 0) {
  			status = "failed";
  		} else if (details.todo) {
  			status = "todo";
  		} else {
  			status = details.skipped ? "skipped" : "passed";
  		}

  		assertList = testItem.getElementsByTagName("ol")[0];

  		good = details.passed;
  		bad = details.failed;

  		// This test passed if it has no unexpected failed assertions
  		var testPassed = details.failed > 0 ? details.todo : !details.todo;

  		if (testPassed) {

  			// Collapse the passing tests
  			addClass(assertList, "qunit-collapsed");
  		} else if (config.collapse) {
  			if (!collapseNext) {

  				// Skip collapsing the first failing test
  				collapseNext = true;
  			} else {

  				// Collapse remaining tests
  				addClass(assertList, "qunit-collapsed");
  			}
  		}

  		// The testItem.firstChild is the test name
  		testTitle = testItem.firstChild;

  		testCounts = bad ? "<b class='failed'>" + bad + "</b>, " + "<b class='passed'>" + good + "</b>, " : "";

  		testTitle.innerHTML += " <b class='counts'>(" + testCounts + details.assertions.length + ")</b>";

  		if (details.skipped) {
  			stats.skippedTests++;

  			testItem.className = "skipped";
  			skipped = document.createElement("em");
  			skipped.className = "qunit-skipped-label";
  			skipped.innerHTML = "skipped";
  			testItem.insertBefore(skipped, testTitle);
  		} else {
  			addEvent(testTitle, "click", function () {
  				toggleClass(assertList, "qunit-collapsed");
  			});

  			testItem.className = testPassed ? "pass" : "fail";

  			if (details.todo) {
  				var todoLabel = document.createElement("em");
  				todoLabel.className = "qunit-todo-label";
  				todoLabel.innerHTML = "todo";
  				testItem.className += " todo";
  				testItem.insertBefore(todoLabel, testTitle);
  			}

  			time = document.createElement("span");
  			time.className = "runtime";
  			time.innerHTML = details.runtime + " ms";
  			testItem.insertBefore(time, assertList);

  			if (!testPassed) {
  				stats.failedTests++;
  			} else if (details.todo) {
  				stats.todoTests++;
  			} else {
  				stats.passedTests++;
  			}
  		}

  		// Show the source of the test when showing assertions
  		if (details.source) {
  			sourceName = document.createElement("p");
  			sourceName.innerHTML = "<strong>Source: </strong>" + escapeText(details.source);
  			addClass(sourceName, "qunit-source");
  			if (testPassed) {
  				addClass(sourceName, "qunit-collapsed");
  			}
  			addEvent(testTitle, "click", function () {
  				toggleClass(sourceName, "qunit-collapsed");
  			});
  			testItem.appendChild(sourceName);
  		}

  		if (config.hidepassed && status === "passed") {

  			// use removeChild instead of remove because of support
  			hiddenTests.push(testItem);

  			tests.removeChild(testItem);
  		}
  	});

  	// Avoid readyState issue with phantomjs
  	// Ref: #818
  	var notPhantom = function (p) {
  		return !(p && p.version && p.version.major > 0);
  	}(window$1.phantom);

  	if (notPhantom && document.readyState === "complete") {
  		QUnit.load();
  	} else {
  		addEvent(window$1, "load", QUnit.load);
  	}

  	// Wrap window.onerror. We will call the original window.onerror to see if
  	// the existing handler fully handles the error; if not, we will call the
  	// QUnit.onError function.
  	var originalWindowOnError = window$1.onerror;

  	// Cover uncaught exceptions
  	// Returning true will suppress the default browser handler,
  	// returning false will let it run.
  	window$1.onerror = function (message, fileName, lineNumber, columnNumber, errorObj) {
  		var ret = false;
  		if (originalWindowOnError) {
  			for (var _len = arguments.length, args = Array(_len > 5 ? _len - 5 : 0), _key = 5; _key < _len; _key++) {
  				args[_key - 5] = arguments[_key];
  			}

  			ret = originalWindowOnError.call.apply(originalWindowOnError, [this, message, fileName, lineNumber, columnNumber, errorObj].concat(args));
  		}

  		// Treat return value as window.onerror itself does,
  		// Only do our handling if not suppressed.
  		if (ret !== true) {
  			var error = {
  				message: message,
  				fileName: fileName,
  				lineNumber: lineNumber
  			};

  			// According to
  			// https://blog.sentry.io/2016/01/04/client-javascript-reporting-window-onerror,
  			// most modern browsers support an errorObj argument; use that to
  			// get a full stack trace if it's available.
  			if (errorObj && errorObj.stack) {
  				error.stacktrace = extractStacktrace(errorObj, 0);
  			}

  			ret = QUnit.onError(error);
  		}

  		return ret;
  	};

  	// Listen for unhandled rejections, and call QUnit.onUnhandledRejection
  	window$1.addEventListener("unhandledrejection", function (event) {
  		QUnit.onUnhandledRejection(event.reason);
  	});
  })();

  /*
   * This file is a modified version of google-diff-match-patch's JavaScript implementation
   * (https://code.google.com/p/google-diff-match-patch/source/browse/trunk/javascript/diff_match_patch_uncompressed.js),
   * modifications are licensed as more fully set forth in LICENSE.txt.
   *
   * The original source of google-diff-match-patch is attributable and licensed as follows:
   *
   * Copyright 2006 Google Inc.
   * https://code.google.com/p/google-diff-match-patch/
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   * More Info:
   *  https://code.google.com/p/google-diff-match-patch/
   *
   * Usage: QUnit.diff(expected, actual)
   *
   */
  QUnit.diff = function () {
  	function DiffMatchPatch() {}

  	//  DIFF FUNCTIONS

  	/**
    * The data structure representing a diff is an array of tuples:
    * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
    * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
    */
  	var DIFF_DELETE = -1,
  	    DIFF_INSERT = 1,
  	    DIFF_EQUAL = 0;

  	/**
    * Find the differences between two texts.  Simplifies the problem by stripping
    * any common prefix or suffix off the texts before diffing.
    * @param {string} text1 Old string to be diffed.
    * @param {string} text2 New string to be diffed.
    * @param {boolean=} optChecklines Optional speedup flag. If present and false,
    *     then don't run a line-level diff first to identify the changed areas.
    *     Defaults to true, which does a faster, slightly less optimal diff.
    * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
    */
  	DiffMatchPatch.prototype.DiffMain = function (text1, text2, optChecklines) {
  		var deadline, checklines, commonlength, commonprefix, commonsuffix, diffs;

  		// The diff must be complete in up to 1 second.
  		deadline = new Date().getTime() + 1000;

  		// Check for null inputs.
  		if (text1 === null || text2 === null) {
  			throw new Error("Null input. (DiffMain)");
  		}

  		// Check for equality (speedup).
  		if (text1 === text2) {
  			if (text1) {
  				return [[DIFF_EQUAL, text1]];
  			}
  			return [];
  		}

  		if (typeof optChecklines === "undefined") {
  			optChecklines = true;
  		}

  		checklines = optChecklines;

  		// Trim off common prefix (speedup).
  		commonlength = this.diffCommonPrefix(text1, text2);
  		commonprefix = text1.substring(0, commonlength);
  		text1 = text1.substring(commonlength);
  		text2 = text2.substring(commonlength);

  		// Trim off common suffix (speedup).
  		commonlength = this.diffCommonSuffix(text1, text2);
  		commonsuffix = text1.substring(text1.length - commonlength);
  		text1 = text1.substring(0, text1.length - commonlength);
  		text2 = text2.substring(0, text2.length - commonlength);

  		// Compute the diff on the middle block.
  		diffs = this.diffCompute(text1, text2, checklines, deadline);

  		// Restore the prefix and suffix.
  		if (commonprefix) {
  			diffs.unshift([DIFF_EQUAL, commonprefix]);
  		}
  		if (commonsuffix) {
  			diffs.push([DIFF_EQUAL, commonsuffix]);
  		}
  		this.diffCleanupMerge(diffs);
  		return diffs;
  	};

  	/**
    * Reduce the number of edits by eliminating operationally trivial equalities.
    * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
    */
  	DiffMatchPatch.prototype.diffCleanupEfficiency = function (diffs) {
  		var changes, equalities, equalitiesLength, lastequality, pointer, preIns, preDel, postIns, postDel;
  		changes = false;
  		equalities = []; // Stack of indices where equalities are found.
  		equalitiesLength = 0; // Keeping our own length var is faster in JS.
  		/** @type {?string} */
  		lastequality = null;

  		// Always equal to diffs[equalities[equalitiesLength - 1]][1]
  		pointer = 0; // Index of current position.

  		// Is there an insertion operation before the last equality.
  		preIns = false;

  		// Is there a deletion operation before the last equality.
  		preDel = false;

  		// Is there an insertion operation after the last equality.
  		postIns = false;

  		// Is there a deletion operation after the last equality.
  		postDel = false;
  		while (pointer < diffs.length) {

  			// Equality found.
  			if (diffs[pointer][0] === DIFF_EQUAL) {
  				if (diffs[pointer][1].length < 4 && (postIns || postDel)) {

  					// Candidate found.
  					equalities[equalitiesLength++] = pointer;
  					preIns = postIns;
  					preDel = postDel;
  					lastequality = diffs[pointer][1];
  				} else {

  					// Not a candidate, and can never become one.
  					equalitiesLength = 0;
  					lastequality = null;
  				}
  				postIns = postDel = false;

  				// An insertion or deletion.
  			} else {

  				if (diffs[pointer][0] === DIFF_DELETE) {
  					postDel = true;
  				} else {
  					postIns = true;
  				}

  				/*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
  				if (lastequality && (preIns && preDel && postIns && postDel || lastequality.length < 2 && preIns + preDel + postIns + postDel === 3)) {

  					// Duplicate record.
  					diffs.splice(equalities[equalitiesLength - 1], 0, [DIFF_DELETE, lastequality]);

  					// Change second copy to insert.
  					diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
  					equalitiesLength--; // Throw away the equality we just deleted;
  					lastequality = null;
  					if (preIns && preDel) {

  						// No changes made which could affect previous entry, keep going.
  						postIns = postDel = true;
  						equalitiesLength = 0;
  					} else {
  						equalitiesLength--; // Throw away the previous equality.
  						pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
  						postIns = postDel = false;
  					}
  					changes = true;
  				}
  			}
  			pointer++;
  		}

  		if (changes) {
  			this.diffCleanupMerge(diffs);
  		}
  	};

  	/**
    * Convert a diff array into a pretty HTML report.
    * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
    * @param {integer} string to be beautified.
    * @return {string} HTML representation.
    */
  	DiffMatchPatch.prototype.diffPrettyHtml = function (diffs) {
  		var op,
  		    data,
  		    x,
  		    html = [];
  		for (x = 0; x < diffs.length; x++) {
  			op = diffs[x][0]; // Operation (insert, delete, equal)
  			data = diffs[x][1]; // Text of change.
  			switch (op) {
  				case DIFF_INSERT:
  					html[x] = "<ins>" + escapeText(data) + "</ins>";
  					break;
  				case DIFF_DELETE:
  					html[x] = "<del>" + escapeText(data) + "</del>";
  					break;
  				case DIFF_EQUAL:
  					html[x] = "<span>" + escapeText(data) + "</span>";
  					break;
  			}
  		}
  		return html.join("");
  	};

  	/**
    * Determine the common prefix of two strings.
    * @param {string} text1 First string.
    * @param {string} text2 Second string.
    * @return {number} The number of characters common to the start of each
    *     string.
    */
  	DiffMatchPatch.prototype.diffCommonPrefix = function (text1, text2) {
  		var pointermid, pointermax, pointermin, pointerstart;

  		// Quick check for common null cases.
  		if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) {
  			return 0;
  		}

  		// Binary search.
  		// Performance analysis: https://neil.fraser.name/news/2007/10/09/
  		pointermin = 0;
  		pointermax = Math.min(text1.length, text2.length);
  		pointermid = pointermax;
  		pointerstart = 0;
  		while (pointermin < pointermid) {
  			if (text1.substring(pointerstart, pointermid) === text2.substring(pointerstart, pointermid)) {
  				pointermin = pointermid;
  				pointerstart = pointermin;
  			} else {
  				pointermax = pointermid;
  			}
  			pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  		}
  		return pointermid;
  	};

  	/**
    * Determine the common suffix of two strings.
    * @param {string} text1 First string.
    * @param {string} text2 Second string.
    * @return {number} The number of characters common to the end of each string.
    */
  	DiffMatchPatch.prototype.diffCommonSuffix = function (text1, text2) {
  		var pointermid, pointermax, pointermin, pointerend;

  		// Quick check for common null cases.
  		if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1)) {
  			return 0;
  		}

  		// Binary search.
  		// Performance analysis: https://neil.fraser.name/news/2007/10/09/
  		pointermin = 0;
  		pointermax = Math.min(text1.length, text2.length);
  		pointermid = pointermax;
  		pointerend = 0;
  		while (pointermin < pointermid) {
  			if (text1.substring(text1.length - pointermid, text1.length - pointerend) === text2.substring(text2.length - pointermid, text2.length - pointerend)) {
  				pointermin = pointermid;
  				pointerend = pointermin;
  			} else {
  				pointermax = pointermid;
  			}
  			pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  		}
  		return pointermid;
  	};

  	/**
    * Find the differences between two texts.  Assumes that the texts do not
    * have any common prefix or suffix.
    * @param {string} text1 Old string to be diffed.
    * @param {string} text2 New string to be diffed.
    * @param {boolean} checklines Speedup flag.  If false, then don't run a
    *     line-level diff first to identify the changed areas.
    *     If true, then run a faster, slightly less optimal diff.
    * @param {number} deadline Time when the diff should be complete by.
    * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
    * @private
    */
  	DiffMatchPatch.prototype.diffCompute = function (text1, text2, checklines, deadline) {
  		var diffs, longtext, shorttext, i, hm, text1A, text2A, text1B, text2B, midCommon, diffsA, diffsB;

  		if (!text1) {

  			// Just add some text (speedup).
  			return [[DIFF_INSERT, text2]];
  		}

  		if (!text2) {

  			// Just delete some text (speedup).
  			return [[DIFF_DELETE, text1]];
  		}

  		longtext = text1.length > text2.length ? text1 : text2;
  		shorttext = text1.length > text2.length ? text2 : text1;
  		i = longtext.indexOf(shorttext);
  		if (i !== -1) {

  			// Shorter text is inside the longer text (speedup).
  			diffs = [[DIFF_INSERT, longtext.substring(0, i)], [DIFF_EQUAL, shorttext], [DIFF_INSERT, longtext.substring(i + shorttext.length)]];

  			// Swap insertions for deletions if diff is reversed.
  			if (text1.length > text2.length) {
  				diffs[0][0] = diffs[2][0] = DIFF_DELETE;
  			}
  			return diffs;
  		}

  		if (shorttext.length === 1) {

  			// Single character string.
  			// After the previous speedup, the character can't be an equality.
  			return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  		}

  		// Check to see if the problem can be split in two.
  		hm = this.diffHalfMatch(text1, text2);
  		if (hm) {

  			// A half-match was found, sort out the return data.
  			text1A = hm[0];
  			text1B = hm[1];
  			text2A = hm[2];
  			text2B = hm[3];
  			midCommon = hm[4];

  			// Send both pairs off for separate processing.
  			diffsA = this.DiffMain(text1A, text2A, checklines, deadline);
  			diffsB = this.DiffMain(text1B, text2B, checklines, deadline);

  			// Merge the results.
  			return diffsA.concat([[DIFF_EQUAL, midCommon]], diffsB);
  		}

  		if (checklines && text1.length > 100 && text2.length > 100) {
  			return this.diffLineMode(text1, text2, deadline);
  		}

  		return this.diffBisect(text1, text2, deadline);
  	};

  	/**
    * Do the two texts share a substring which is at least half the length of the
    * longer text?
    * This speedup can produce non-minimal diffs.
    * @param {string} text1 First string.
    * @param {string} text2 Second string.
    * @return {Array.<string>} Five element Array, containing the prefix of
    *     text1, the suffix of text1, the prefix of text2, the suffix of
    *     text2 and the common middle.  Or null if there was no match.
    * @private
    */
  	DiffMatchPatch.prototype.diffHalfMatch = function (text1, text2) {
  		var longtext, shorttext, dmp, text1A, text2B, text2A, text1B, midCommon, hm1, hm2, hm;

  		longtext = text1.length > text2.length ? text1 : text2;
  		shorttext = text1.length > text2.length ? text2 : text1;
  		if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
  			return null; // Pointless.
  		}
  		dmp = this; // 'this' becomes 'window' in a closure.

  		/**
     * Does a substring of shorttext exist within longtext such that the substring
     * is at least half the length of longtext?
     * Closure, but does not reference any external variables.
     * @param {string} longtext Longer string.
     * @param {string} shorttext Shorter string.
     * @param {number} i Start index of quarter length substring within longtext.
     * @return {Array.<string>} Five element Array, containing the prefix of
     *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
     *     of shorttext and the common middle.  Or null if there was no match.
     * @private
     */
  		function diffHalfMatchI(longtext, shorttext, i) {
  			var seed, j, bestCommon, prefixLength, suffixLength, bestLongtextA, bestLongtextB, bestShorttextA, bestShorttextB;

  			// Start with a 1/4 length substring at position i as a seed.
  			seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
  			j = -1;
  			bestCommon = "";
  			while ((j = shorttext.indexOf(seed, j + 1)) !== -1) {
  				prefixLength = dmp.diffCommonPrefix(longtext.substring(i), shorttext.substring(j));
  				suffixLength = dmp.diffCommonSuffix(longtext.substring(0, i), shorttext.substring(0, j));
  				if (bestCommon.length < suffixLength + prefixLength) {
  					bestCommon = shorttext.substring(j - suffixLength, j) + shorttext.substring(j, j + prefixLength);
  					bestLongtextA = longtext.substring(0, i - suffixLength);
  					bestLongtextB = longtext.substring(i + prefixLength);
  					bestShorttextA = shorttext.substring(0, j - suffixLength);
  					bestShorttextB = shorttext.substring(j + prefixLength);
  				}
  			}
  			if (bestCommon.length * 2 >= longtext.length) {
  				return [bestLongtextA, bestLongtextB, bestShorttextA, bestShorttextB, bestCommon];
  			} else {
  				return null;
  			}
  		}

  		// First check if the second quarter is the seed for a half-match.
  		hm1 = diffHalfMatchI(longtext, shorttext, Math.ceil(longtext.length / 4));

  		// Check again based on the third quarter.
  		hm2 = diffHalfMatchI(longtext, shorttext, Math.ceil(longtext.length / 2));
  		if (!hm1 && !hm2) {
  			return null;
  		} else if (!hm2) {
  			hm = hm1;
  		} else if (!hm1) {
  			hm = hm2;
  		} else {

  			// Both matched.  Select the longest.
  			hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  		}

  		// A half-match was found, sort out the return data.
  		if (text1.length > text2.length) {
  			text1A = hm[0];
  			text1B = hm[1];
  			text2A = hm[2];
  			text2B = hm[3];
  		} else {
  			text2A = hm[0];
  			text2B = hm[1];
  			text1A = hm[2];
  			text1B = hm[3];
  		}
  		midCommon = hm[4];
  		return [text1A, text1B, text2A, text2B, midCommon];
  	};

  	/**
    * Do a quick line-level diff on both strings, then rediff the parts for
    * greater accuracy.
    * This speedup can produce non-minimal diffs.
    * @param {string} text1 Old string to be diffed.
    * @param {string} text2 New string to be diffed.
    * @param {number} deadline Time when the diff should be complete by.
    * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
    * @private
    */
  	DiffMatchPatch.prototype.diffLineMode = function (text1, text2, deadline) {
  		var a, diffs, linearray, pointer, countInsert, countDelete, textInsert, textDelete, j;

  		// Scan the text on a line-by-line basis first.
  		a = this.diffLinesToChars(text1, text2);
  		text1 = a.chars1;
  		text2 = a.chars2;
  		linearray = a.lineArray;

  		diffs = this.DiffMain(text1, text2, false, deadline);

  		// Convert the diff back to original text.
  		this.diffCharsToLines(diffs, linearray);

  		// Eliminate freak matches (e.g. blank lines)
  		this.diffCleanupSemantic(diffs);

  		// Rediff any replacement blocks, this time character-by-character.
  		// Add a dummy entry at the end.
  		diffs.push([DIFF_EQUAL, ""]);
  		pointer = 0;
  		countDelete = 0;
  		countInsert = 0;
  		textDelete = "";
  		textInsert = "";
  		while (pointer < diffs.length) {
  			switch (diffs[pointer][0]) {
  				case DIFF_INSERT:
  					countInsert++;
  					textInsert += diffs[pointer][1];
  					break;
  				case DIFF_DELETE:
  					countDelete++;
  					textDelete += diffs[pointer][1];
  					break;
  				case DIFF_EQUAL:

  					// Upon reaching an equality, check for prior redundancies.
  					if (countDelete >= 1 && countInsert >= 1) {

  						// Delete the offending records and add the merged ones.
  						diffs.splice(pointer - countDelete - countInsert, countDelete + countInsert);
  						pointer = pointer - countDelete - countInsert;
  						a = this.DiffMain(textDelete, textInsert, false, deadline);
  						for (j = a.length - 1; j >= 0; j--) {
  							diffs.splice(pointer, 0, a[j]);
  						}
  						pointer = pointer + a.length;
  					}
  					countInsert = 0;
  					countDelete = 0;
  					textDelete = "";
  					textInsert = "";
  					break;
  			}
  			pointer++;
  		}
  		diffs.pop(); // Remove the dummy entry at the end.

  		return diffs;
  	};

  	/**
    * Find the 'middle snake' of a diff, split the problem in two
    * and return the recursively constructed diff.
    * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
    * @param {string} text1 Old string to be diffed.
    * @param {string} text2 New string to be diffed.
    * @param {number} deadline Time at which to bail if not yet complete.
    * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
    * @private
    */
  	DiffMatchPatch.prototype.diffBisect = function (text1, text2, deadline) {
  		var text1Length, text2Length, maxD, vOffset, vLength, v1, v2, x, delta, front, k1start, k1end, k2start, k2end, k2Offset, k1Offset, x1, x2, y1, y2, d, k1, k2;

  		// Cache the text lengths to prevent multiple calls.
  		text1Length = text1.length;
  		text2Length = text2.length;
  		maxD = Math.ceil((text1Length + text2Length) / 2);
  		vOffset = maxD;
  		vLength = 2 * maxD;
  		v1 = new Array(vLength);
  		v2 = new Array(vLength);

  		// Setting all elements to -1 is faster in Chrome & Firefox than mixing
  		// integers and undefined.
  		for (x = 0; x < vLength; x++) {
  			v1[x] = -1;
  			v2[x] = -1;
  		}
  		v1[vOffset + 1] = 0;
  		v2[vOffset + 1] = 0;
  		delta = text1Length - text2Length;

  		// If the total number of characters is odd, then the front path will collide
  		// with the reverse path.
  		front = delta % 2 !== 0;

  		// Offsets for start and end of k loop.
  		// Prevents mapping of space beyond the grid.
  		k1start = 0;
  		k1end = 0;
  		k2start = 0;
  		k2end = 0;
  		for (d = 0; d < maxD; d++) {

  			// Bail out if deadline is reached.
  			if (new Date().getTime() > deadline) {
  				break;
  			}

  			// Walk the front path one step.
  			for (k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
  				k1Offset = vOffset + k1;
  				if (k1 === -d || k1 !== d && v1[k1Offset - 1] < v1[k1Offset + 1]) {
  					x1 = v1[k1Offset + 1];
  				} else {
  					x1 = v1[k1Offset - 1] + 1;
  				}
  				y1 = x1 - k1;
  				while (x1 < text1Length && y1 < text2Length && text1.charAt(x1) === text2.charAt(y1)) {
  					x1++;
  					y1++;
  				}
  				v1[k1Offset] = x1;
  				if (x1 > text1Length) {

  					// Ran off the right of the graph.
  					k1end += 2;
  				} else if (y1 > text2Length) {

  					// Ran off the bottom of the graph.
  					k1start += 2;
  				} else if (front) {
  					k2Offset = vOffset + delta - k1;
  					if (k2Offset >= 0 && k2Offset < vLength && v2[k2Offset] !== -1) {

  						// Mirror x2 onto top-left coordinate system.
  						x2 = text1Length - v2[k2Offset];
  						if (x1 >= x2) {

  							// Overlap detected.
  							return this.diffBisectSplit(text1, text2, x1, y1, deadline);
  						}
  					}
  				}
  			}

  			// Walk the reverse path one step.
  			for (k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
  				k2Offset = vOffset + k2;
  				if (k2 === -d || k2 !== d && v2[k2Offset - 1] < v2[k2Offset + 1]) {
  					x2 = v2[k2Offset + 1];
  				} else {
  					x2 = v2[k2Offset - 1] + 1;
  				}
  				y2 = x2 - k2;
  				while (x2 < text1Length && y2 < text2Length && text1.charAt(text1Length - x2 - 1) === text2.charAt(text2Length - y2 - 1)) {
  					x2++;
  					y2++;
  				}
  				v2[k2Offset] = x2;
  				if (x2 > text1Length) {

  					// Ran off the left of the graph.
  					k2end += 2;
  				} else if (y2 > text2Length) {

  					// Ran off the top of the graph.
  					k2start += 2;
  				} else if (!front) {
  					k1Offset = vOffset + delta - k2;
  					if (k1Offset >= 0 && k1Offset < vLength && v1[k1Offset] !== -1) {
  						x1 = v1[k1Offset];
  						y1 = vOffset + x1 - k1Offset;

  						// Mirror x2 onto top-left coordinate system.
  						x2 = text1Length - x2;
  						if (x1 >= x2) {

  							// Overlap detected.
  							return this.diffBisectSplit(text1, text2, x1, y1, deadline);
  						}
  					}
  				}
  			}
  		}

  		// Diff took too long and hit the deadline or
  		// number of diffs equals number of characters, no commonality at all.
  		return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  	};

  	/**
    * Given the location of the 'middle snake', split the diff in two parts
    * and recurse.
    * @param {string} text1 Old string to be diffed.
    * @param {string} text2 New string to be diffed.
    * @param {number} x Index of split point in text1.
    * @param {number} y Index of split point in text2.
    * @param {number} deadline Time at which to bail if not yet complete.
    * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
    * @private
    */
  	DiffMatchPatch.prototype.diffBisectSplit = function (text1, text2, x, y, deadline) {
  		var text1a, text1b, text2a, text2b, diffs, diffsb;
  		text1a = text1.substring(0, x);
  		text2a = text2.substring(0, y);
  		text1b = text1.substring(x);
  		text2b = text2.substring(y);

  		// Compute both diffs serially.
  		diffs = this.DiffMain(text1a, text2a, false, deadline);
  		diffsb = this.DiffMain(text1b, text2b, false, deadline);

  		return diffs.concat(diffsb);
  	};

  	/**
    * Reduce the number of edits by eliminating semantically trivial equalities.
    * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
    */
  	DiffMatchPatch.prototype.diffCleanupSemantic = function (diffs) {
  		var changes, equalities, equalitiesLength, lastequality, pointer, lengthInsertions2, lengthDeletions2, lengthInsertions1, lengthDeletions1, deletion, insertion, overlapLength1, overlapLength2;
  		changes = false;
  		equalities = []; // Stack of indices where equalities are found.
  		equalitiesLength = 0; // Keeping our own length var is faster in JS.
  		/** @type {?string} */
  		lastequality = null;

  		// Always equal to diffs[equalities[equalitiesLength - 1]][1]
  		pointer = 0; // Index of current position.

  		// Number of characters that changed prior to the equality.
  		lengthInsertions1 = 0;
  		lengthDeletions1 = 0;

  		// Number of characters that changed after the equality.
  		lengthInsertions2 = 0;
  		lengthDeletions2 = 0;
  		while (pointer < diffs.length) {
  			if (diffs[pointer][0] === DIFF_EQUAL) {
  				// Equality found.
  				equalities[equalitiesLength++] = pointer;
  				lengthInsertions1 = lengthInsertions2;
  				lengthDeletions1 = lengthDeletions2;
  				lengthInsertions2 = 0;
  				lengthDeletions2 = 0;
  				lastequality = diffs[pointer][1];
  			} else {
  				// An insertion or deletion.
  				if (diffs[pointer][0] === DIFF_INSERT) {
  					lengthInsertions2 += diffs[pointer][1].length;
  				} else {
  					lengthDeletions2 += diffs[pointer][1].length;
  				}

  				// Eliminate an equality that is smaller or equal to the edits on both
  				// sides of it.
  				if (lastequality && lastequality.length <= Math.max(lengthInsertions1, lengthDeletions1) && lastequality.length <= Math.max(lengthInsertions2, lengthDeletions2)) {

  					// Duplicate record.
  					diffs.splice(equalities[equalitiesLength - 1], 0, [DIFF_DELETE, lastequality]);

  					// Change second copy to insert.
  					diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;

  					// Throw away the equality we just deleted.
  					equalitiesLength--;

  					// Throw away the previous equality (it needs to be reevaluated).
  					equalitiesLength--;
  					pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;

  					// Reset the counters.
  					lengthInsertions1 = 0;
  					lengthDeletions1 = 0;
  					lengthInsertions2 = 0;
  					lengthDeletions2 = 0;
  					lastequality = null;
  					changes = true;
  				}
  			}
  			pointer++;
  		}

  		// Normalize the diff.
  		if (changes) {
  			this.diffCleanupMerge(diffs);
  		}

  		// Find any overlaps between deletions and insertions.
  		// e.g: <del>abcxxx</del><ins>xxxdef</ins>
  		//   -> <del>abc</del>xxx<ins>def</ins>
  		// e.g: <del>xxxabc</del><ins>defxxx</ins>
  		//   -> <ins>def</ins>xxx<del>abc</del>
  		// Only extract an overlap if it is as big as the edit ahead or behind it.
  		pointer = 1;
  		while (pointer < diffs.length) {
  			if (diffs[pointer - 1][0] === DIFF_DELETE && diffs[pointer][0] === DIFF_INSERT) {
  				deletion = diffs[pointer - 1][1];
  				insertion = diffs[pointer][1];
  				overlapLength1 = this.diffCommonOverlap(deletion, insertion);
  				overlapLength2 = this.diffCommonOverlap(insertion, deletion);
  				if (overlapLength1 >= overlapLength2) {
  					if (overlapLength1 >= deletion.length / 2 || overlapLength1 >= insertion.length / 2) {

  						// Overlap found.  Insert an equality and trim the surrounding edits.
  						diffs.splice(pointer, 0, [DIFF_EQUAL, insertion.substring(0, overlapLength1)]);
  						diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlapLength1);
  						diffs[pointer + 1][1] = insertion.substring(overlapLength1);
  						pointer++;
  					}
  				} else {
  					if (overlapLength2 >= deletion.length / 2 || overlapLength2 >= insertion.length / 2) {

  						// Reverse overlap found.
  						// Insert an equality and swap and trim the surrounding edits.
  						diffs.splice(pointer, 0, [DIFF_EQUAL, deletion.substring(0, overlapLength2)]);

  						diffs[pointer - 1][0] = DIFF_INSERT;
  						diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlapLength2);
  						diffs[pointer + 1][0] = DIFF_DELETE;
  						diffs[pointer + 1][1] = deletion.substring(overlapLength2);
  						pointer++;
  					}
  				}
  				pointer++;
  			}
  			pointer++;
  		}
  	};

  	/**
    * Determine if the suffix of one string is the prefix of another.
    * @param {string} text1 First string.
    * @param {string} text2 Second string.
    * @return {number} The number of characters common to the end of the first
    *     string and the start of the second string.
    * @private
    */
  	DiffMatchPatch.prototype.diffCommonOverlap = function (text1, text2) {
  		var text1Length, text2Length, textLength, best, length, pattern, found;

  		// Cache the text lengths to prevent multiple calls.
  		text1Length = text1.length;
  		text2Length = text2.length;

  		// Eliminate the null case.
  		if (text1Length === 0 || text2Length === 0) {
  			return 0;
  		}

  		// Truncate the longer string.
  		if (text1Length > text2Length) {
  			text1 = text1.substring(text1Length - text2Length);
  		} else if (text1Length < text2Length) {
  			text2 = text2.substring(0, text1Length);
  		}
  		textLength = Math.min(text1Length, text2Length);

  		// Quick check for the worst case.
  		if (text1 === text2) {
  			return textLength;
  		}

  		// Start by looking for a single character match
  		// and increase length until no match is found.
  		// Performance analysis: https://neil.fraser.name/news/2010/11/04/
  		best = 0;
  		length = 1;
  		while (true) {
  			pattern = text1.substring(textLength - length);
  			found = text2.indexOf(pattern);
  			if (found === -1) {
  				return best;
  			}
  			length += found;
  			if (found === 0 || text1.substring(textLength - length) === text2.substring(0, length)) {
  				best = length;
  				length++;
  			}
  		}
  	};

  	/**
    * Split two texts into an array of strings.  Reduce the texts to a string of
    * hashes where each Unicode character represents one line.
    * @param {string} text1 First string.
    * @param {string} text2 Second string.
    * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
    *     An object containing the encoded text1, the encoded text2 and
    *     the array of unique strings.
    *     The zeroth element of the array of unique strings is intentionally blank.
    * @private
    */
  	DiffMatchPatch.prototype.diffLinesToChars = function (text1, text2) {
  		var lineArray, lineHash, chars1, chars2;
  		lineArray = []; // E.g. lineArray[4] === 'Hello\n'
  		lineHash = {}; // E.g. lineHash['Hello\n'] === 4

  		// '\x00' is a valid character, but various debuggers don't like it.
  		// So we'll insert a junk entry to avoid generating a null character.
  		lineArray[0] = "";

  		/**
     * Split a text into an array of strings.  Reduce the texts to a string of
     * hashes where each Unicode character represents one line.
     * Modifies linearray and linehash through being a closure.
     * @param {string} text String to encode.
     * @return {string} Encoded string.
     * @private
     */
  		function diffLinesToCharsMunge(text) {
  			var chars, lineStart, lineEnd, lineArrayLength, line;
  			chars = "";

  			// Walk the text, pulling out a substring for each line.
  			// text.split('\n') would would temporarily double our memory footprint.
  			// Modifying text would create many large strings to garbage collect.
  			lineStart = 0;
  			lineEnd = -1;

  			// Keeping our own length variable is faster than looking it up.
  			lineArrayLength = lineArray.length;
  			while (lineEnd < text.length - 1) {
  				lineEnd = text.indexOf("\n", lineStart);
  				if (lineEnd === -1) {
  					lineEnd = text.length - 1;
  				}
  				line = text.substring(lineStart, lineEnd + 1);
  				lineStart = lineEnd + 1;

  				var lineHashExists = lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) : lineHash[line] !== undefined;

  				if (lineHashExists) {
  					chars += String.fromCharCode(lineHash[line]);
  				} else {
  					chars += String.fromCharCode(lineArrayLength);
  					lineHash[line] = lineArrayLength;
  					lineArray[lineArrayLength++] = line;
  				}
  			}
  			return chars;
  		}

  		chars1 = diffLinesToCharsMunge(text1);
  		chars2 = diffLinesToCharsMunge(text2);
  		return {
  			chars1: chars1,
  			chars2: chars2,
  			lineArray: lineArray
  		};
  	};

  	/**
    * Rehydrate the text in a diff from a string of line hashes to real lines of
    * text.
    * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
    * @param {!Array.<string>} lineArray Array of unique strings.
    * @private
    */
  	DiffMatchPatch.prototype.diffCharsToLines = function (diffs, lineArray) {
  		var x, chars, text, y;
  		for (x = 0; x < diffs.length; x++) {
  			chars = diffs[x][1];
  			text = [];
  			for (y = 0; y < chars.length; y++) {
  				text[y] = lineArray[chars.charCodeAt(y)];
  			}
  			diffs[x][1] = text.join("");
  		}
  	};

  	/**
    * Reorder and merge like edit sections.  Merge equalities.
    * Any edit section can move as long as it doesn't cross an equality.
    * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
    */
  	DiffMatchPatch.prototype.diffCleanupMerge = function (diffs) {
  		var pointer, countDelete, countInsert, textInsert, textDelete, commonlength, changes, diffPointer, position;
  		diffs.push([DIFF_EQUAL, ""]); // Add a dummy entry at the end.
  		pointer = 0;
  		countDelete = 0;
  		countInsert = 0;
  		textDelete = "";
  		textInsert = "";

  		while (pointer < diffs.length) {
  			switch (diffs[pointer][0]) {
  				case DIFF_INSERT:
  					countInsert++;
  					textInsert += diffs[pointer][1];
  					pointer++;
  					break;
  				case DIFF_DELETE:
  					countDelete++;
  					textDelete += diffs[pointer][1];
  					pointer++;
  					break;
  				case DIFF_EQUAL:

  					// Upon reaching an equality, check for prior redundancies.
  					if (countDelete + countInsert > 1) {
  						if (countDelete !== 0 && countInsert !== 0) {

  							// Factor out any common prefixes.
  							commonlength = this.diffCommonPrefix(textInsert, textDelete);
  							if (commonlength !== 0) {
  								if (pointer - countDelete - countInsert > 0 && diffs[pointer - countDelete - countInsert - 1][0] === DIFF_EQUAL) {
  									diffs[pointer - countDelete - countInsert - 1][1] += textInsert.substring(0, commonlength);
  								} else {
  									diffs.splice(0, 0, [DIFF_EQUAL, textInsert.substring(0, commonlength)]);
  									pointer++;
  								}
  								textInsert = textInsert.substring(commonlength);
  								textDelete = textDelete.substring(commonlength);
  							}

  							// Factor out any common suffixies.
  							commonlength = this.diffCommonSuffix(textInsert, textDelete);
  							if (commonlength !== 0) {
  								diffs[pointer][1] = textInsert.substring(textInsert.length - commonlength) + diffs[pointer][1];
  								textInsert = textInsert.substring(0, textInsert.length - commonlength);
  								textDelete = textDelete.substring(0, textDelete.length - commonlength);
  							}
  						}

  						// Delete the offending records and add the merged ones.
  						if (countDelete === 0) {
  							diffs.splice(pointer - countInsert, countDelete + countInsert, [DIFF_INSERT, textInsert]);
  						} else if (countInsert === 0) {
  							diffs.splice(pointer - countDelete, countDelete + countInsert, [DIFF_DELETE, textDelete]);
  						} else {
  							diffs.splice(pointer - countDelete - countInsert, countDelete + countInsert, [DIFF_DELETE, textDelete], [DIFF_INSERT, textInsert]);
  						}
  						pointer = pointer - countDelete - countInsert + (countDelete ? 1 : 0) + (countInsert ? 1 : 0) + 1;
  					} else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {

  						// Merge this equality with the previous one.
  						diffs[pointer - 1][1] += diffs[pointer][1];
  						diffs.splice(pointer, 1);
  					} else {
  						pointer++;
  					}
  					countInsert = 0;
  					countDelete = 0;
  					textDelete = "";
  					textInsert = "";
  					break;
  			}
  		}
  		if (diffs[diffs.length - 1][1] === "") {
  			diffs.pop(); // Remove the dummy entry at the end.
  		}

  		// Second pass: look for single edits surrounded on both sides by equalities
  		// which can be shifted sideways to eliminate an equality.
  		// e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  		changes = false;
  		pointer = 1;

  		// Intentionally ignore the first and last element (don't need checking).
  		while (pointer < diffs.length - 1) {
  			if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {

  				diffPointer = diffs[pointer][1];
  				position = diffPointer.substring(diffPointer.length - diffs[pointer - 1][1].length);

  				// This is a single edit surrounded by equalities.
  				if (position === diffs[pointer - 1][1]) {

  					// Shift the edit over the previous equality.
  					diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
  					diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
  					diffs.splice(pointer - 1, 1);
  					changes = true;
  				} else if (diffPointer.substring(0, diffs[pointer + 1][1].length) === diffs[pointer + 1][1]) {

  					// Shift the edit over the next equality.
  					diffs[pointer - 1][1] += diffs[pointer + 1][1];
  					diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
  					diffs.splice(pointer + 1, 1);
  					changes = true;
  				}
  			}
  			pointer++;
  		}

  		// If shifts were made, the diff needs reordering and another shift sweep.
  		if (changes) {
  			this.diffCleanupMerge(diffs);
  		}
  	};

  	return function (o, n) {
  		var diff, output, text;
  		diff = new DiffMatchPatch();
  		output = diff.DiffMain(o, n);
  		diff.diffCleanupEfficiency(output);
  		text = diff.diffPrettyHtml(output);

  		return text;
  	};
  }();

}((function() { return this; }())));

/**
 * https://cdn.jsdelivr.net/npm/sinon@1.17.6/pkg/sinon.min.js
 *
 * Minified by jsDelivr using UglifyJS v3.4.4.
 * Original file: /npm/sinon@1.17.6/pkg/sinon.js
 * 
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
!function(e,t){"use strict";"function"==typeof define&&define.amd?define("sinon",[],function(){return e.sinon=t()}):"object"==typeof exports?module.exports=t():e.sinon=t()}(this,function(){"use strict";var samsam,formatio,lolex,define;!function(){function define(e,t,n){"samsam"==e?samsam=t():"function"==typeof t&&0===e.length?lolex=t():"function"==typeof n&&(formatio=n(samsam))}define.amd={},("function"==typeof define&&define.amd&&function(e){define("samsam",e)}||"object"==typeof module&&function(e){module.exports=e()}||function(e){this.samsam=e()})(function(){var s,R=Object.prototype,t="undefined"!=typeof document&&document.createElement("div");function D(e){return"number"==typeof e&&e!==e}function P(e){return R.toString.call(e).split(/[ \]]/)[1]}function I(e){if("Arguments"===P(e))return!0;if("object"!=typeof e||"number"!=typeof e.length||"Array"===P(e))return!1;if("function"==typeof e.callee)return!0;try{e[e.length]=6,delete e[e.length]}catch(e){return!0}return!1}function N(e){if(!e||1!==e.nodeType||!t)return!1;try{e.appendChild(t),e.removeChild(t)}catch(e){return!1}return!0}function M(e){var t,n=[];for(t in e)R.hasOwnProperty.call(e,t)&&n.push(t);return n}function L(e){return"function"==typeof e.getTime&&e.getTime()==e.valueOf()}function n(e){return 0===e&&1/e==-1/0}function F(e,t){if(e===t||D(e)&&D(t))return 0!==e||n(e)===n(t)}return{isArguments:I,isElement:N,isDate:L,isNegZero:n,identical:F,deepEqual:function(e,t){var T=[],k=[],A=[],j=[],O={};function S(e){return!("object"!=typeof e||null===e||e instanceof Boolean||e instanceof Date||e instanceof Number||e instanceof RegExp||e instanceof String)}function q(e,t){var n;for(n=0;n<e.length;n++)if(e[n]===t)return n;return-1}return function e(t,n,r,o){var i=typeof t,s=typeof n;if(t===n||D(t)||D(n)||null==t||null==n||"object"!==i||"object"!==s)return F(t,n);if(N(t)||N(n))return!1;var a=L(t),l=L(n);if((a||l)&&(!a||!l||t.getTime()!==n.getTime()))return!1;if(t instanceof RegExp&&n instanceof RegExp&&t.toString()!==n.toString())return!1;var c,u,f,h,p,d,y,m,g,v,b,w=P(t),x=P(n),C=M(t),E=M(n);if(I(t)||I(n)){if(t.length!==n.length)return!1}else if(i!==s||w!==x||C.length!==E.length)return!1;for(u=0,f=C.length;u<f;u++){if(c=C[u],!R.hasOwnProperty.call(n,c))return!1;if(h=t[c],p=n[c],d=S(h),y=S(p),m=d?q(T,h):-1,g=y?q(k,p):-1,v=-1!==m?A[m]:r+"["+JSON.stringify(c)+"]",b=-1!==g?j[g]:o+"["+JSON.stringify(c)+"]",O[v+b])return!0;if(-1===m&&d&&(T.push(h),A.push(v)),-1===g&&y&&(k.push(p),j.push(b)),d&&y&&(O[v+b]=!0),!e(h,p,v,b))return!1}return!0}(e,t,"$1","$2")},match:s=function e(t,n){if(n&&"function"==typeof n.test)return n.test(t);if("function"==typeof n)return!0===n(t);if("string"==typeof n)return n=n.toLowerCase(),("string"==typeof t||!!t)&&0<=String(t).toLowerCase().indexOf(n);if("number"==typeof n)return n===t;if("boolean"==typeof n)return n===t;if(void 0===n)return void 0===t;if(null===n)return null===t;if("Array"===P(t)&&"Array"===P(n))return function(e,t){if(0===t.length)return!0;var n,r,o,i;for(n=0,r=e.length;n<r;++n)if(s(e[n],t[0])){for(o=0,i=t.length;o<i;++o)if(!s(e[n+o],t[o]))return!1;return!0}return!1}(t,n);if(n&&"object"==typeof n){if(n===t)return!0;var r;for(r in n){var o=t[r];if(void 0===o&&"function"==typeof t.getAttribute&&(o=t.getAttribute(r)),null===n[r]||void 0===n[r]){if(o!==n[r])return!1}else if(void 0===o||!e(o,n[r]))return!1}return!0}throw new Error("Matcher was not a string, a number, a function, a boolean or an object")},keys:M}}),("function"==typeof define&&define.amd&&function(e){define("formatio",["samsam"],e)}||"object"==typeof module&&function(e){module.exports=e(require("samsam"))}||function(e){this.formatio=e(this.samsam)})(function(y){var s={excludeConstructors:["Object",/^.$/],quoteStrings:!0,limitChildrenCount:0},a=(Object.prototype.hasOwnProperty,[]);function l(e){if(!e)return"";if(e.displayName)return e.displayName;if(e.name)return e.name;var t=e.toString().match(/function\s+([^\(]+)/m);return t&&t[1]||""}function m(e,t){var n,r,o=l(t&&t.constructor),i=e.excludeConstructors||s.excludeConstructors||[];for(n=0,r=i.length;n<r;++n){if("string"==typeof i[n]&&i[n]===o)return"";if(i[n].test&&i[n].test(o))return""}return o}function g(e,t){if("object"!=typeof e)return!1;var n,r;for(n=0,r=t.length;n<r;++n)if(t[n]===e)return!0;return!1}function v(e,t,n,r){if("string"==typeof t){var o=e.quoteStrings;return n||("boolean"!=typeof o||o)?'"'+t+'"':t}if("function"==typeof t&&!(t instanceof RegExp))return v.func(t);if(g(t,n=n||[]))return"[Circular]";if("[object Array]"===Object.prototype.toString.call(t))return v.array.call(e,t,n);if(!t)return String(1/t==-1/0?"-0":t);if(y.isElement(t))return v.element(t);if("function"==typeof t.toString&&t.toString!==Object.prototype.toString)return t.toString();var i,s;for(i=0,s=a.length;i<s;i++)if(t===a[i].object)return a[i].value;return v.object.call(e,t,n,r)}function t(e){for(var t in e)this[t]=e[t]}return"undefined"!=typeof global&&a.push({object:global,value:"[object global]"}),"undefined"!=typeof document&&a.push({object:document,value:"[object HTMLDocument]"}),"undefined"!=typeof window&&a.push({object:window,value:"[object Window]"}),v.func=function(e){return"function "+l(e)+"() {}"},v.array=function(e,t){(t=t||[]).push(e);var n,r,o=[];for(r=0<this.limitChildrenCount?Math.min(this.limitChildrenCount,e.length):e.length,n=0;n<r;++n)o.push(v(this,e[n],t));return r<e.length&&o.push("[... "+(e.length-r)+" more elements]"),"["+o.join(", ")+"]"},v.object=function(e,t,n){(t=t||[]).push(e),n=n||0;var r,o,i,s,a,l,c=[],u=y.keys(e).sort(),f=3;for(l=0<this.limitChildrenCount?Math.min(this.limitChildrenCount,u.length):u.length,s=0;s<l;++s)o=g(i=e[r=u[s]],t)?"[Circular]":v(this,i,t,n+2),f+=(o=(/\s/.test(r)?'"'+r+'"':r)+": "+o).length,c.push(o);var h=m(this,e),p=h?"["+h+"] ":"",d="";for(s=0,a=n;s<a;++s)d+=" ";return l<u.length&&c.push("[... "+(u.length-l)+" more elements]"),80<f+n?p+"{\n  "+d+c.join(",\n  "+d)+"\n"+d+"}":p+"{ "+c.join(", ")+" }"},v.element=function(e){var t,n,r,o,i,s=e.tagName.toLowerCase(),a=e.attributes,l=[];for(r=0,o=a.length;r<o;++r)n=(t=a.item(r)).nodeName.toLowerCase().replace("html:",""),i=t.nodeValue,"contenteditable"===n&&"inherit"===i||i&&l.push(n+'="'+i+'"');var c="<"+s+(0<l.length?" ":""),u=e.innerHTML;return 20<u.length&&(u=u.substr(0,20)+"[...]"),(c+l.join(" ")+">"+u+"</"+s+">").replace(/ contentEditable="inherit"/,"")},t.prototype={functionName:l,configure:function(e){return new t(e)},constructorName:function(e){return m(this,e)},ascii:function(e,t,n){return v(this,e,t,n)}}}),function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;"undefined"!=typeof window?t=window:"undefined"!=typeof global?t=global:"undefined"!=typeof self&&(t=self),t.lolex=e()}}(function(){var define,module,exports;return function i(s,a,l){function c(n,e){if(!a[n]){if(!s[n]){var t="function"==typeof require&&require;if(!e&&t)return t(n,!0);if(u)return u(n,!0);var r=new Error("Cannot find module '"+n+"'");throw r.code="MODULE_NOT_FOUND",r}var o=a[n]={exports:{}};s[n][0].call(o.exports,function(e){var t=s[n][1][e];return c(t||e)},o,o.exports,i,s,a,l)}return a[n].exports}for(var u="function"==typeof require&&require,e=0;e<l.length;e++)c(l[e]);return c}({1:[function(require,module,exports){(function(global){!function(global){var glbl=global;global.setTimeout=glbl.setTimeout,global.clearTimeout=glbl.clearTimeout,global.setInterval=glbl.setInterval,global.clearInterval=glbl.clearInterval,global.Date=glbl.Date,"setImmediate"in global&&(global.setImmediate=glbl.setImmediate,global.clearImmediate=glbl.clearImmediate);var NOOP=function(){},timeoutResult=setTimeout(NOOP,0),addTimerReturnsObject="object"==typeof timeoutResult;clearTimeout(timeoutResult);var NativeDate=Date,uniqueTimerId=1;function parseTime(e){if(!e)return 0;var t,n=e.split(":"),r=n.length,o=r,i=0;if(3<r||!/^(\d\d:){0,2}\d\d?$/.test(e))throw new Error("tick only understands numbers and 'h:m:s'");for(;o--;){if(60<=(t=parseInt(n[o],10)))throw new Error("Invalid time "+e);i+=t*Math.pow(60,r-o-1)}return 1e3*i}function getEpoch(e){if(!e)return 0;if("function"==typeof e.getTime)return e.getTime();if("number"==typeof e)return e;throw new TypeError("now should be milliseconds since UNIX epoch")}function inRange(e,t,n){return n&&n.callAt>=e&&n.callAt<=t}function mirrorDateProperties(e,t){var n;for(n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);return t.now?e.now=function(){return e.clock.now}:delete e.now,t.toSource?e.toSource=function(){return t.toSource()}:delete e.toSource,e.toString=function(){return t.toString()},e.prototype=t.prototype,e.parse=t.parse,e.UTC=t.UTC,e.prototype.toUTCString=t.prototype.toUTCString,e}function createDate(){return mirrorDateProperties(function e(t,n,r,o,i,s,a){switch(arguments.length){case 0:return new NativeDate(e.clock.now);case 1:return new NativeDate(t);case 2:return new NativeDate(t,n);case 3:return new NativeDate(t,n,r);case 4:return new NativeDate(t,n,r,o);case 5:return new NativeDate(t,n,r,o,i);case 6:return new NativeDate(t,n,r,o,i,s);default:return new NativeDate(t,n,r,o,i,s,a)}},NativeDate)}function addTimer(e,t){if(void 0===t.func)throw new Error("Callback must be provided to timer calls");return e.timers||(e.timers={}),t.id=uniqueTimerId++,t.createdAt=e.now,t.callAt=e.now+(t.delay||(e.duringTick?1:0)),e.timers[t.id]=t,addTimerReturnsObject?{id:t.id,ref:NOOP,unref:NOOP}:t.id}function compareTimers(e,t){return e.callAt<t.callAt?-1:e.callAt>t.callAt?1:e.immediate&&!t.immediate?-1:!e.immediate&&t.immediate?1:e.createdAt<t.createdAt?-1:e.createdAt>t.createdAt?1:e.id<t.id?-1:e.id>t.id?1:void 0}function firstTimerInRange(e,t,n){var r,o=e.timers,i=null;for(r in o)o.hasOwnProperty(r)&&(!inRange(t,n,o[r])||i&&1!==compareTimers(i,o[r])||(i=o[r]));return i}function callTimer(clock,timer){var exception;"number"==typeof timer.interval?clock.timers[timer.id].callAt+=timer.interval:delete clock.timers[timer.id];try{"function"==typeof timer.func?timer.func.apply(null,timer.args):eval(timer.func)}catch(e){exception=e}if(clock.timers[timer.id]){if(exception)throw exception}else if(exception)throw exception}function timerType(e){return e.immediate?"Immediate":void 0!==e.interval?"Interval":"Timeout"}function clearTimer(e,t,n){if(t&&(e.timers||(e.timers=[]),"object"==typeof t&&(t=t.id),e.timers.hasOwnProperty(t))){var r=e.timers[t];if(timerType(r)!==n)throw new Error("Cannot clear timer: timer created with set"+n+"() but cleared with clear"+timerType(r)+"()");delete e.timers[t]}}function uninstall(e,t){var n,r,o;for(r=0,o=e.methods.length;r<o;r++)if(t[n=e.methods[r]].hadOwnProperty)t[n]=e["_"+n];else try{delete t[n]}catch(e){}e.methods=[]}function hijackMethod(e,t,n){var r;if(n[t].hadOwnProperty=Object.prototype.hasOwnProperty.call(e,t),n["_"+t]=e[t],"Date"===t){var o=mirrorDateProperties(n[t],e[t]);e[t]=o}else for(r in e[t]=function(){return n[t].apply(n,arguments)},n[t])n[t].hasOwnProperty(r)&&(e[t][r]=n[t][r]);e[t].clock=n}var timers={setTimeout:setTimeout,clearTimeout:clearTimeout,setImmediate:global.setImmediate,clearImmediate:global.clearImmediate,setInterval:setInterval,clearInterval:clearInterval,Date:Date},keys=Object.keys||function(e){var t,n=[];for(t in e)e.hasOwnProperty(t)&&n.push(t);return n};function createClock(e){var a={now:getEpoch(e),timeouts:{},Date:createDate()};return(a.Date.clock=a).setTimeout=function(e,t){return addTimer(a,{func:e,args:Array.prototype.slice.call(arguments,2),delay:t})},a.clearTimeout=function(e){return clearTimer(a,e,"Timeout")},a.setInterval=function(e,t){return addTimer(a,{func:e,args:Array.prototype.slice.call(arguments,2),delay:t,interval:t})},a.clearInterval=function(e){return clearTimer(a,e,"Interval")},a.setImmediate=function(e){return addTimer(a,{func:e,args:Array.prototype.slice.call(arguments,1),immediate:!0})},a.clearImmediate=function(e){return clearTimer(a,e,"Immediate")},a.tick=function(e){e="number"==typeof e?e:parseTime(e);var t,n,r=a.now,o=a.now+e,i=a.now,s=firstTimerInRange(a,r,o);for(a.duringTick=!0;s&&r<=o;){if(a.timers[s.id]){r=a.now=s.callAt;try{t=a.now,callTimer(a,s),t!==a.now&&(r+=a.now-t,o+=a.now-t,i+=a.now-t)}catch(e){n=n||e}}s=firstTimerInRange(a,i,o),i=r}if(a.duringTick=!1,a.now=o,n)throw n;return a.now},a.reset=function(){a.timers={}},a.setSystemTime=function(e){var t=getEpoch(e),n=t-a.now;for(var r in a.now=t,a.timers)if(a.timers.hasOwnProperty(r)){var o=a.timers[r];o.createdAt+=n,o.callAt+=n}},a}exports.timers=timers,exports.createClock=createClock,exports.install=function(e,t,n){var r,o;"number"==typeof e&&(n=t,t=e,e=null),e||(e=global);var i=createClock(t);for(i.uninstall=function(){uninstall(i,e)},i.methods=n||[],0===i.methods.length&&(i.methods=keys(timers)),r=0,o=i.methods.length;r<o;r++)hijackMethod(e,i.methods[r],i);return i}}(global||this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[1])(1)})}();var sinon=function(){var r,e="undefined"!=typeof module&&module.exports&&"function"==typeof require;function t(e,t,n){r=n.exports=e("./sinon/util/core"),e("./sinon/extend"),e("./sinon/walk"),e("./sinon/typeOf"),e("./sinon/times_in_words"),e("./sinon/spy"),e("./sinon/call"),e("./sinon/behavior"),e("./sinon/stub"),e("./sinon/mock"),e("./sinon/collection"),e("./sinon/assert"),e("./sinon/sandbox"),e("./sinon/test"),e("./sinon/test_case"),e("./sinon/match"),e("./sinon/format"),e("./sinon/log_error")}return"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):e?(t(require,module.exports,module),r=module.exports):r={},r}();function getGlobal(){return"undefined"!=typeof window?window:global}return function(e){var n="undefined"!=typeof document&&document.createElement("div"),p=Object.prototype.hasOwnProperty;function a(e){return n&&e&&1===e.nodeType&&function(e){var t=!1;try{e.appendChild(n),t=n.parentNode===e}catch(e){return!1}finally{try{e.removeChild(n)}catch(e){}}return t}(e)}function l(e){return"number"==typeof e&&isNaN(e)}function d(e,t){for(var n in t)p.call(e,n)||(e[n]=t[n])}function r(e){return"function"==typeof e&&"function"==typeof e.restore&&e.restore.sinon}var y="keys"in Object;function o(h){return h.wrapMethod=function(e,o,t){if(!e)throw new TypeError("Should wrap property of object");if("function"!=typeof t&&"object"!=typeof t)throw new TypeError("Method wrapper should be a function or a property descriptor");function n(e){var t,n;if("function"==typeof(n=e)||n&&n.constructor&&n.call&&n.apply){if(e.restore&&e.restore.sinon)t=new TypeError("Attempted to wrap "+o+" which is already wrapped");else if(e.calledBefore){var r=e.returns?"stubbed":"spied on";t=new TypeError("Attempted to wrap "+o+" which is already "+r)}}else t=new TypeError("Attempted to wrap "+typeof e+" property "+o+" as function");if(t)throw e&&e.stackTrace&&(t.stack+="\n--------------\n"+e.stackTrace),t}var r,i,s;function a(){n(i=e[o]),(e[o]=t).displayName=o}var l=e.hasOwnProperty?e.hasOwnProperty(o):p.call(e,o);if(y){var c="function"==typeof t?{value:t}:t,u=h.getPropertyDescriptor(e,o);if(u?u.restore&&u.restore.sinon&&(r=new TypeError("Attempted to wrap "+o+" which is already wrapped")):r=new TypeError("Attempted to wrap "+typeof i+" property "+o+" as function"),r)throw u&&u.stackTrace&&(r.stack+="\n--------------\n"+u.stackTrace),r;var f=h.objectKeys(c);for(s=0;s<f.length;s++)n(i=u[f[s]]);for(d(c,u),s=0;s<f.length;s++)d(c[f[s]],u[f[s]]);Object.defineProperty(e,o,c),"function"==typeof t&&e[o]!==t&&(delete e[o],a())}else a();return t.displayName=o,t.stackTrace=new Error("Stack Trace for original").stack,t.restore=function(){if(l)y&&Object.defineProperty(e,o,u);else try{delete e[o]}catch(e){}e[o]===t&&(e[o]=i)},t.restore.sinon=!0,y||d(t,i),t},h.create=function(e){var t=function(){};return t.prototype=e,new t},h.deepEqual=function e(t,n){if(h.match&&h.match.isMatcher(t))return t.test(n);if("object"!=typeof t||"object"!=typeof n)return l(t)&&l(n)||t===n;if(a(t)||a(n))return t===n;if(t===n)return!0;if(null===t&&null!==n||null!==t&&null===n)return!1;if(t instanceof RegExp&&n instanceof RegExp)return t.source===n.source&&t.global===n.global&&t.ignoreCase===n.ignoreCase&&t.multiline===n.multiline;var r,o=Object.prototype.toString.call(t);if(o!==Object.prototype.toString.call(n))return!1;if("[object Date]"===o)return t.valueOf()===n.valueOf();var i=0,s=0;if("[object Array]"===o&&t.length!==n.length)return!1;for(r in t)if(p.call(t,r)){if(i+=1,!(r in n))return!1;if(!e(t[r],n[r]))return!1}for(r in n)p.call(n,r)&&(s+=1);return i===s},h.functionName=function(e){var t=e.displayName||e.name;if(!t){var n=e.toString().match(/function ([^\s\(]+)/);t=n&&n[1]}return t},h.functionToString=function(){if(this.getCall&&this.callCount)for(var e,t,n=this.callCount;n--;)for(t in e=this.getCall(n).thisValue)if(e[t]===this)return t;return this.displayName||"sinon fake"},h.objectKeys=function(e){if(e!==Object(e))throw new TypeError("sinon.objectKeys called on a non-object");var t,n=[];for(t in e)p.call(e,t)&&n.push(t);return n},h.getPropertyDescriptor=function(e,t){for(var n,r=e;r&&!(n=Object.getOwnPropertyDescriptor(r,t));)r=Object.getPrototypeOf(r);return n},h.getConfig=function(e){var t={};e=e||{};var n=h.defaultConfig;for(var r in n)n.hasOwnProperty(r)&&(t[r]=e.hasOwnProperty(r)?e[r]:n[r]);return t},h.defaultConfig={injectIntoThis:!0,injectInto:null,properties:["spy","stub","mock","clock","server","requests"],useFakeTimers:!0,useFakeServer:!0},h.timesInWords=function(e){return(1===e?"once":2===e&&"twice")||3===e&&"thrice"||(e||0)+" times"},h.calledInOrder=function(e){for(var t=1,n=e.length;t<n;t++)if(!e[t-1].calledBefore(e[t])||!e[t].called)return!1;return!0},h.orderByFirstCall=function(e){return e.sort(function(e,t){var n=e.getCall(0),r=t.getCall(0);return(n&&n.callId||-1)<(r&&r.callId||-1)?-1:1})},h.createStubInstance=function(e){if("function"!=typeof e)throw new TypeError("The constructor should be a function.");return h.stub(h.create(e.prototype))},h.restore=function(e){if(null!==e&&"object"==typeof e)for(var t in e)r(e[t])&&e[t].restore();else r(e)&&e.restore()},h}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function i(e,t){o(t)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(i):t?i(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(e){var i=function(){var e={constructor:function(){return"0"},toString:function(){return"1"},valueOf:function(){return"2"},toLocaleString:function(){return"3"},prototype:function(){return"4"},isPrototypeOf:function(){return"5"},propertyIsEnumerable:function(){return"6"},hasOwnProperty:function(){return"7"},length:function(){return"8"},unique:function(){return"9"}},t=[];for(var n in e)e.hasOwnProperty(n)&&t.push(e[n]());return"0123456789"!==t.join("")}();return e.extend=function(e){var t,n,r,o=Array.prototype.slice.call(arguments,1);for(n=0;n<o.length;n++){for(r in t=o[n])t.hasOwnProperty(r)&&(e[r]=t[r]);i&&t.hasOwnProperty("toString")&&t.toString!==e.toString&&(e.toString=t.toString)}return e},e.extend}function t(e,t,n){var r=e("./util/core");n.exports=o(r)}var n="undefined"!=typeof module&&module.exports&&"function"==typeof require;"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):n?t(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(e){return e.timesInWords=function(e){switch(e){case 1:return"once";case 2:return"twice";case 3:return"thrice";default:return(e||0)+" times"}},e.timesInWords}function t(e,t,n){var r=e("./util/core");n.exports=o(r)}var n="undefined"!=typeof module&&module.exports&&"function"==typeof require;"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):n?t(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(e){return e.typeOf=function(e){if(null===e)return"null";if(void 0===e)return"undefined";var t=Object.prototype.toString.call(e);return t.substring(8,t.length-1).toLowerCase()},e.typeOf}function t(e,t,n){var r=e("./util/core");n.exports=o(r)}var n="undefined"!=typeof module&&module.exports&&"function"==typeof require;"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):n?t(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(s){function a(e,t,n){var r=s.typeOf(e);if(r!==t)throw new TypeError("Expected type of "+n+" to be "+t+", but was "+r)}var i={toString:function(){return this.message}};function l(e){return i.isPrototypeOf(e)}function c(t,e){var n=s.create(i);switch(s.typeOf(t)){case"object":if("function"==typeof t.test)return n.test=function(e){return!0===t.test(e)},n.message="match("+s.functionName(t.test)+")",n;var r=[];for(var o in t)t.hasOwnProperty(o)&&r.push(o+": "+t[o]);n.test=function(e){return function e(t,n){if(null==n)return!1;for(var r in t)if(t.hasOwnProperty(r)){var o=t[r],i=n[r];if(l(o)){if(!o.test(i))return!1}else if("object"===s.typeOf(o)){if(!e(o,i))return!1}else if(!s.deepEqual(o,i))return!1}return!0}(t,e)},n.message="match("+r.join(", ")+")";break;case"number":n.test=function(e){return t==e};break;case"string":n.test=function(e){return"string"==typeof e&&-1!==e.indexOf(t)},n.message='match("'+t+'")';break;case"regexp":n.test=function(e){return"string"==typeof e&&t.test(e)};break;case"function":n.test=t,n.message=e||"match("+s.functionName(t)+")";break;default:n.test=function(e){return s.deepEqual(t,e)}}return n.message||(n.message="match("+t+")"),n}function e(o,i){return function(t,n){a(t,"string","property");var r=1===arguments.length,e=i+'("'+t+'"';return r||(e+=", "+n),c(function(e){return!(null==e||!o(e,t))&&(r||s.deepEqual(n,e[t]))},e+=")")}}return i.or=function(t){if(!arguments.length)throw new TypeError("Matcher expected");l(t)||(t=c(t));var n=this,e=s.create(i);return e.test=function(e){return n.test(e)||t.test(e)},e.message=n.message+".or("+t.message+")",e},i.and=function(t){if(!arguments.length)throw new TypeError("Matcher expected");l(t)||(t=c(t));var n=this,e=s.create(i);return e.test=function(e){return n.test(e)&&t.test(e)},e.message=n.message+".and("+t.message+")",e},c.isMatcher=l,c.any=c(function(){return!0},"any"),c.defined=c(function(e){return null!=e},"defined"),c.truthy=c(function(e){return!!e},"truthy"),c.falsy=c(function(e){return!e},"falsy"),c.same=function(t){return c(function(e){return t===e},"same("+t+")")},c.typeOf=function(t){return a(t,"string","type"),c(function(e){return s.typeOf(e)===t},'typeOf("'+t+'")')},c.instanceOf=function(t){return a(t,"function","type"),c(function(e){return e instanceof t},"instanceOf("+s.functionName(t)+")")},c.has=e(function(e,t){return"object"==typeof e?t in e:void 0!==e[t]},"has"),c.hasOwn=e(function(e,t){return e.hasOwnProperty(t)},"hasOwn"),c.bool=c.typeOf("boolean"),c.number=c.typeOf("number"),c.string=c.typeOf("string"),c.object=c.typeOf("object"),c.func=c.typeOf("function"),c.array=c.typeOf("array"),c.regexp=c.typeOf("regexp"),c.date=c.typeOf("date"),s.match=c}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./typeOf"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e,i){function o(e){function n(e){return""+e}var t,r,o="undefined"!=typeof module&&module.exports&&"function"==typeof require;if(o)try{i=require("formatio")}catch(e){}return i?(r=i.configure({quoteStrings:!1,limitChildrenCount:250}),t=function(){return r.ascii.apply(r,arguments)}):t=o?function(){try{var t=require("util")}catch(e){}return t?function(e){return"object"==typeof e&&e.toString===Object.prototype.toString?t.inspect(e):e}:n}():n,e.format=t,e.format}function t(e,t,n){var r=e("./util/core");n.exports=o(r)}var n="undefined"!=typeof module&&module.exports&&"function"==typeof require;"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):n?t(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon,"object"==typeof formatio&&formatio),function(e){var s=Array.prototype.slice;function o(l){function i(e,t,n){var r=l.functionName(e)+t;throw n.length&&(r+=" Received ["+s.call(n).join(", ")+"]"),new Error(r)}var c={calledOn:function(e){return l.match&&l.match.isMatcher(e)?e.test(this.thisValue):this.thisValue===e},calledWith:function(){var e=arguments.length;if(e>this.args.length)return!1;for(var t=0;t<e;t+=1)if(!l.deepEqual(arguments[t],this.args[t]))return!1;return!0},calledWithMatch:function(){var e=arguments.length;if(e>this.args.length)return!1;for(var t=0;t<e;t+=1){var n=this.args[t],r=arguments[t];if(!l.match||!l.match(r).test(n))return!1}return!0},calledWithExactly:function(){return arguments.length===this.args.length&&this.calledWith.apply(this,arguments)},notCalledWith:function(){return!this.calledWith.apply(this,arguments)},notCalledWithMatch:function(){return!this.calledWithMatch.apply(this,arguments)},returned:function(e){return l.deepEqual(e,this.returnValue)},threw:function(e){return void 0!==e&&this.exception?this.exception===e||this.exception.name===e:!!this.exception},calledWithNew:function(){return this.proxy.prototype&&this.thisValue instanceof this.proxy},calledBefore:function(e){return this.callId<e.callId},calledAfter:function(e){return this.callId>e.callId},callArg:function(e){this.args[e]()},callArgOn:function(e,t){this.args[e].apply(t)},callArgWith:function(e){this.callArgOnWith.apply(this,[e,null].concat(s.call(arguments,1)))},callArgOnWith:function(e,t){var n=s.call(arguments,2);this.args[e].apply(t,n)},yield:function(){this.yieldOn.apply(this,[null].concat(s.call(arguments,0)))},yieldOn:function(e){for(var t=this.args,n=0,r=t.length;n<r;++n)if("function"==typeof t[n])return void t[n].apply(e,s.call(arguments,1));i(this.proxy," cannot yield since no callback was passed.",t)},yieldTo:function(e){this.yieldToOn.apply(this,[e,null].concat(s.call(arguments,1)))},yieldToOn:function(e,t){for(var n=this.args,r=0,o=n.length;r<o;++r)if(n[r]&&"function"==typeof n[r][e])return void n[r][e].apply(t,s.call(arguments,2));i(this.proxy," cannot yield to '"+e+"' since no callback was passed.",n)},getStackFrames:function(){return this.stack&&this.stack.split("\n").slice(3)},toString:function(){var e=this.proxy?this.proxy.toString()+"(":"",t=[];if(!this.args)return":(";for(var n=0,r=this.args.length;n<r;++n)t.push(l.format(this.args[n]));return e=e+t.join(", ")+")",void 0!==this.returnValue&&(e+=" => "+l.format(this.returnValue)),this.exception&&(e+=" !"+this.exception.name,this.exception.message&&(e+="("+this.exception.message+")")),this.stack&&(e+=this.getStackFrames()[0].replace(/^\s*(?:at\s+|@)?/," at ")),e}};function e(e,t,n,r,o,i,s){if("number"!=typeof i)throw new TypeError("Call id is not a number");var a=l.create(c);return a.proxy=e,a.thisValue=t,a.args=n,a.returnValue=r,a.exception=o,a.callId=i,a.stack=s,a}return c.invokeCallback=c.yield,e.toString=c.toString,l.spyCall=e}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./match"),e("./format"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(sinonGlobal){function makeApi(sinon){var push=Array.prototype.push,slice=Array.prototype.slice,callId=0;function spy(e,t,n){if(!t&&"function"==typeof e)return spy.create(e);if(!e&&!t)return spy.create(function(){});if(n){for(var r=sinon.getPropertyDescriptor(e,t),o=0;o<n.length;o++)r[n[o]]=spy.create(r[n[o]]);return sinon.wrapMethod(e,t,r)}return sinon.wrapMethod(e,t,spy.create(e[t]))}function matchingFake(e,t,n){if(e)for(var r=0,o=e.length;r<o;r++)if(e[r].matches(t,n))return e[r]}function incrementCallCount(){this.called=!0,this.callCount+=1,this.notCalled=!1,this.calledOnce=1===this.callCount,this.calledTwice=2===this.callCount,this.calledThrice=3===this.callCount}function createCallProperties(){this.firstCall=this.getCall(0),this.secondCall=this.getCall(1),this.thirdCall=this.getCall(2),this.lastCall=this.getCall(this.callCount-1)}var vars="a,b,c,d,e,f,g,h,i,j,k,l";function createProxy(func,proxyLength){var p;return proxyLength?eval("p = (function proxy("+vars.substring(0,2*proxyLength-1)+") { return p.invoke(func, this, slice.call(arguments)); });"):p=function(){return p.invoke(func,this,slice.call(arguments))},p.isSinonProxy=!0,p}var uuid=0,spyApi={reset:function(){if(this.invoking){var e=new Error("Cannot reset Sinon function while invoking it. Move the call to .reset outside of the callback.");throw e.name="InvalidResetException",e}if(this.called=!1,this.notCalled=!0,this.calledOnce=!1,this.calledTwice=!1,this.calledThrice=!1,this.callCount=0,this.firstCall=null,this.secondCall=null,this.thirdCall=null,this.lastCall=null,this.args=[],this.returnValues=[],this.thisValues=[],this.exceptions=[],this.callIds=[],this.stacks=[],this.fakes)for(var t=0;t<this.fakes.length;t++)this.fakes[t].reset();return this},create:function(e,t){var n;"function"!=typeof e?e=function(){}:n=sinon.functionName(e),t||(t=e.length);var r=createProxy(e,t);return sinon.extend(r,spy),delete r.create,sinon.extend(r,e),r.reset(),r.prototype=e.prototype,r.displayName=n||"spy",r.toString=sinon.functionToString,r.instantiateFake=sinon.spy.create,r.id="spy#"+uuid++,r},invoke:function(e,t,n){var r,o,i=matchingFake(this.fakes,n);incrementCallCount.call(this),push.call(this.thisValues,t),push.call(this.args,n),push.call(this.callIds,callId++),createCallProperties.call(this);try{this.invoking=!0,o=i?i.invoke(e,t,n):(this.func||e).apply(t,n),this.getCall(this.callCount-1).calledWithNew()&&"object"!=typeof o&&(o=t)}catch(e){r=e}finally{delete this.invoking}if(push.call(this.exceptions,r),push.call(this.returnValues,o),push.call(this.stacks,(new Error).stack),createCallProperties.call(this),void 0!==r)throw r;return o},named:function(e){return this.displayName=e,this},getCall:function(e){return e<0||e>=this.callCount?null:sinon.spyCall(this,this.thisValues[e],this.args[e],this.returnValues[e],this.exceptions[e],this.callIds[e],this.stacks[e])},getCalls:function(){var e,t=[];for(e=0;e<this.callCount;e++)t.push(this.getCall(e));return t},calledBefore:function(e){return!!this.called&&(!e.called||this.callIds[0]<e.callIds[e.callIds.length-1])},calledAfter:function(e){return!(!this.called||!e.called)&&this.callIds[this.callCount-1]>e.callIds[e.callCount-1]},withArgs:function(){var e=slice.call(arguments);if(this.fakes){var t=matchingFake(this.fakes,e,!0);if(t)return t}else this.fakes=[];var n=this,r=this.instantiateFake();r.matchingAguments=e,r.parent=this,push.call(this.fakes,r),r.withArgs=function(){return n.withArgs.apply(n,arguments)};for(var o=0;o<this.args.length;o++)r.matches(this.args[o])&&(incrementCallCount.call(r),push.call(r.thisValues,this.thisValues[o]),push.call(r.args,this.args[o]),push.call(r.returnValues,this.returnValues[o]),push.call(r.exceptions,this.exceptions[o]),push.call(r.callIds,this.callIds[o]));return createCallProperties.call(r),r},matches:function(e,t){var n=this.matchingAguments;if(n.length<=e.length&&sinon.deepEqual(n,e.slice(0,n.length)))return!t||n.length===e.length},printf:function(e){var n,r=this,o=slice.call(arguments,1);return(e||"").replace(/%(.)/g,function(e,t){return"function"==typeof(n=spyApi.formatters[t])?n.call(null,r,o):isNaN(parseInt(t,10))?"%"+t:sinon.format(o[t-1])})}};function delegateToCalls(o,i,s,a){spyApi[o]=function(){if(!this.called)return!!a&&a.apply(this,arguments);for(var e,t=0,n=0,r=this.callCount;n<r;n+=1)if((e=this.getCall(n))[s||o].apply(e,arguments)&&(t+=1,i))return!0;return t===this.callCount}}return delegateToCalls("calledOn",!0),delegateToCalls("alwaysCalledOn",!1,"calledOn"),delegateToCalls("calledWith",!0),delegateToCalls("calledWithMatch",!0),delegateToCalls("alwaysCalledWith",!1,"calledWith"),delegateToCalls("alwaysCalledWithMatch",!1,"calledWithMatch"),delegateToCalls("calledWithExactly",!0),delegateToCalls("alwaysCalledWithExactly",!1,"calledWithExactly"),delegateToCalls("neverCalledWith",!1,"notCalledWith",function(){return!0}),delegateToCalls("neverCalledWithMatch",!1,"notCalledWithMatch",function(){return!0}),delegateToCalls("threw",!0),delegateToCalls("alwaysThrew",!1,"threw"),delegateToCalls("returned",!0),delegateToCalls("alwaysReturned",!1,"returned"),delegateToCalls("calledWithNew",!0),delegateToCalls("alwaysCalledWithNew",!1,"calledWithNew"),delegateToCalls("callArg",!1,"callArgWith",function(){throw new Error(this.toString()+" cannot call arg since it was not yet invoked.")}),spyApi.callArgWith=spyApi.callArg,delegateToCalls("callArgOn",!1,"callArgOnWith",function(){throw new Error(this.toString()+" cannot call arg since it was not yet invoked.")}),spyApi.callArgOnWith=spyApi.callArgOn,delegateToCalls("yield",!1,"yield",function(){throw new Error(this.toString()+" cannot yield since it was not yet invoked.")}),spyApi.invokeCallback=spyApi.yield,delegateToCalls("yieldOn",!1,"yieldOn",function(){throw new Error(this.toString()+" cannot yield since it was not yet invoked.")}),delegateToCalls("yieldTo",!1,"yieldTo",function(e){throw new Error(this.toString()+" cannot yield to '"+e+"' since it was not yet invoked.")}),delegateToCalls("yieldToOn",!1,"yieldToOn",function(e){throw new Error(this.toString()+" cannot yield to '"+e+"' since it was not yet invoked.")}),spyApi.formatters={c:function(e){return sinon.timesInWords(e.callCount)},n:function(e){return e.toString()},C:function(e){for(var t=[],n=0,r=e.callCount;n<r;++n){var o="    "+e.getCall(n).toString();/\n/.test(t[n-1])&&(o="\n"+o),push.call(t,o)}return 0<t.length?"\n"+t.join("\n"):""},t:function(e){for(var t=[],n=0,r=e.callCount;n<r;++n)push.call(t,sinon.format(e.thisValues[n]));return t.join(", ")},"*":function(e,t){for(var n=[],r=0,o=t.length;r<o;++r)push.call(n,sinon.format(t[r]));return n.join(", ")}},sinon.extend(spy,spyApi),spy.spyCall=sinon.spyCall,sinon.spy=spy,spy}var isNode="undefined"!=typeof module&&module.exports&&"function"==typeof require,isAMD="function"==typeof define&&"object"==typeof define.amd&&define.amd;function loadDependencies(e,t,n){var r=e("./util/core");e("./call"),e("./extend"),e("./times_in_words"),e("./format"),n.exports=makeApi(r)}isAMD?define(loadDependencies):isNode?loadDependencies(require,module.exports,module):sinonGlobal&&makeApi(sinonGlobal)}("object"==typeof sinon&&sinon),function(e){var l=Array.prototype.slice,c=Array.prototype.join,u=-1,f=-2,h="object"==typeof process&&"function"==typeof process.nextTick?process.nextTick:"function"==typeof setImmediate?setImmediate:function(e){setTimeout(e,0)};function o(e,t){return"string"==typeof e?(this.exception=new Error(t||""),this.exception.name=e):this.exception=e||new Error("Error"),this}function i(a){function n(e,t){if("number"==typeof e.callArgAt){var n=function(e,t){var n,r=e.callArgAt;if(0<=r)return t[r];r===u&&(n=t),r===f&&(n=l.call(t).reverse());for(var o=e.callArgProp,i=0,s=n.length;i<s;++i){if(!o&&"function"==typeof n[i])return n[i];if(o&&n[i]&&"function"==typeof n[i][o])return n[i][o]}return null}(e,t);if("function"!=typeof n)throw new TypeError((o=n,i=t,(r=e).callArgAt<0?(s=r.callArgProp?a.functionName(r.stub)+" expected to yield to '"+r.callArgProp+"', but no object with such a property was passed.":a.functionName(r.stub)+" expected to yield, but no callback was passed.",0<i.length&&(s+=" Received ["+c.call(i,", ")+"]"),s):"argument at index "+r.callArgAt+" is not a function: "+o));e.callbackAsync?h(function(){n.apply(e.callbackContext,e.callbackArguments)}):n.apply(e.callbackContext,e.callbackArguments)}var r,o,i,s}var e={create:function(e){var t=a.extend({},a.behavior);return delete t.create,t.stub=e,t},isPresent:function(){return"number"==typeof this.callArgAt||this.exception||"number"==typeof this.returnArgAt||this.returnThis||this.returnValueDefined},invoke:function(e,t){if(n(this,t),this.exception)throw this.exception;return"number"==typeof this.returnArgAt?t[this.returnArgAt]:this.returnThis?e:this.returnValue},onCall:function(e){return this.stub.onCall(e)},onFirstCall:function(){return this.stub.onFirstCall()},onSecondCall:function(){return this.stub.onSecondCall()},onThirdCall:function(){return this.stub.onThirdCall()},withArgs:function(){throw new Error('Defining a stub by invoking "stub.onCall(...).withArgs(...)" is not supported. Use "stub.withArgs(...).onCall(...)" to define sequential behavior for calls with certain arguments.')},callsArg:function(e){if("number"!=typeof e)throw new TypeError("argument index is not number");return this.callArgAt=e,this.callbackArguments=[],this.callbackContext=void 0,this.callArgProp=void 0,this.callbackAsync=!1,this},callsArgOn:function(e,t){if("number"!=typeof e)throw new TypeError("argument index is not number");if("object"!=typeof t)throw new TypeError("argument context is not an object");return this.callArgAt=e,this.callbackArguments=[],this.callbackContext=t,this.callArgProp=void 0,this.callbackAsync=!1,this},callsArgWith:function(e){if("number"!=typeof e)throw new TypeError("argument index is not number");return this.callArgAt=e,this.callbackArguments=l.call(arguments,1),this.callbackContext=void 0,this.callArgProp=void 0,this.callbackAsync=!1,this},callsArgOnWith:function(e,t){if("number"!=typeof e)throw new TypeError("argument index is not number");if("object"!=typeof t)throw new TypeError("argument context is not an object");return this.callArgAt=e,this.callbackArguments=l.call(arguments,2),this.callbackContext=t,this.callArgProp=void 0,this.callbackAsync=!1,this},yields:function(){return this.callArgAt=u,this.callbackArguments=l.call(arguments,0),this.callbackContext=void 0,this.callArgProp=void 0,this.callbackAsync=!1,this},yieldsRight:function(){return this.callArgAt=f,this.callbackArguments=l.call(arguments,0),this.callbackContext=void 0,this.callArgProp=void 0,this.callbackAsync=!1,this},yieldsOn:function(e){if("object"!=typeof e)throw new TypeError("argument context is not an object");return this.callArgAt=u,this.callbackArguments=l.call(arguments,1),this.callbackContext=e,this.callArgProp=void 0,this.callbackAsync=!1,this},yieldsTo:function(e){return this.callArgAt=u,this.callbackArguments=l.call(arguments,1),this.callbackContext=void 0,this.callArgProp=e,this.callbackAsync=!1,this},yieldsToOn:function(e,t){if("object"!=typeof t)throw new TypeError("argument context is not an object");return this.callArgAt=u,this.callbackArguments=l.call(arguments,2),this.callbackContext=t,this.callArgProp=e,this.callbackAsync=!1,this},throws:o,throwsException:o,returns:function(e){return this.returnValue=e,this.returnValueDefined=!0,this.exception=void 0,this},returnsArg:function(e){if("number"!=typeof e)throw new TypeError("argument index is not number");return this.returnArgAt=e,this},returnsThis:function(){return this.returnThis=!0,this}};function t(t){return function(){var e=this[t].apply(this,arguments);return this.callbackAsync=!0,e}}for(var r in e)e.hasOwnProperty(r)&&r.match(/^(callsArg|yields)/)&&!r.match(/Async/)&&(e[r+"Async"]=t(r));return a.behavior=e}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./extend"),n.exports=i(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&i(e)}("object"==typeof sinon&&sinon),function(e){function o(e){return e.walk=function(e,t,n){return function e(n,r,o,i,s){var t,a;if("function"==typeof Object.getOwnPropertyNames)Object.getOwnPropertyNames(n).forEach(function(e){if(!s[e]){s[e]=!0;var t="function"==typeof Object.getOwnPropertyDescriptor(n,e).get?i:n;r.call(o,t[e],e,t)}}),(t=Object.getPrototypeOf(n))&&e(t,r,o,i,s);else for(a in n)r.call(o,n[a],a,n)}(e,t,n,e,{})},e.walk}function t(e,t,n){var r=e("./util/core");n.exports=o(r)}var n="undefined"!=typeof module&&module.exports&&"function"==typeof require;"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):n?t(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(a){function l(r,e,t){if(t&&"function"!=typeof t&&"object"!=typeof t)throw new TypeError("Custom stub should be a function or a property descriptor");var n;if(t){if("function"==typeof t)n=a.spy&&a.spy.create?a.spy.create(t):t;else if(n=t,a.spy&&a.spy.create)for(var o=a.objectKeys(n),i=0;i<o.length;i++)n[o[i]]=a.spy.create(n[o[i]])}else{var s=0;"object"==typeof r&&"function"==typeof r[e]&&(s=r[e].length),n=l.create(s)}return r||void 0!==e?void 0===e&&"object"==typeof r?(a.walk(r||{},function(e,t,n){n!==Object.prototype&&"constructor"!==t&&"function"==typeof a.getPropertyDescriptor(n,t).value&&l(r,t)}),r):a.wrapMethod(r,e,n):a.stub.create()}function n(e){return e.defaultBehavior||(t=e).parent&&r(t.parent)||a.behavior.create(e);var t}function r(e){var t=e.behaviors[e.callCount-1];return t&&t.isPresent()?t:n(e)}var o=0,e={create:function(e){var t=function(){return r(t).invoke(this,arguments)};t.id="stub#"+o++;var n=t;return(t=a.spy.create(t,e)).func=n,a.extend(t,l),t.instantiateFake=a.stub.create,t.displayName="stub",t.toString=a.functionToString,t.defaultBehavior=null,t.behaviors=[],t},resetBehavior:function(){var e;if(this.defaultBehavior=null,this.behaviors=[],delete this.returnValue,delete this.returnArgAt,this.returnThis=!1,this.fakes)for(e=0;e<this.fakes.length;e++)this.fakes[e].resetBehavior()},onCall:function(e){return this.behaviors[e]||(this.behaviors[e]=a.behavior.create(this)),this.behaviors[e]},onFirstCall:function(){return this.onCall(0)},onSecondCall:function(){return this.onCall(1)},onThirdCall:function(){return this.onCall(2)}};function t(e){return function(){return this.defaultBehavior=this.defaultBehavior||a.behavior.create(this),this.defaultBehavior[e].apply(this.defaultBehavior,arguments),this}}for(var i in a.behavior)a.behavior.hasOwnProperty(i)&&!e.hasOwnProperty(i)&&"create"!==i&&"withArgs"!==i&&"invoke"!==i&&(e[i]=t(i));return a.extend(l,e),a.stub=l}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./behavior"),e("./spy"),e("./extend"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(u){var f=[].push,n=u.match;function r(e){return e?r.create(e):u.expectation.create("Anonymous mock")}function o(e,t){if(e)for(var n=0,r=e.length;n<r;n+=1)t(e[n])}function h(e,t,n){if(n&&e.length!==t.length)return!1;for(var r=0,o=e.length;r<o;r++)if(!u.deepEqual(e[r],t[r]))return!1;return!0}u.extend(r,{create:function(e){if(!e)throw new TypeError("object is null");var t=u.extend({},r);return t.object=e,delete t.create,t},expects:function(e){if(!e)throw new TypeError("method is falsy");if(this.expectations||(this.expectations={},this.proxies=[]),!this.expectations[e]){this.expectations[e]=[];var t=this;u.wrapMethod(this.object,e,function(){return t.invokeMethod(e,this,arguments)}),f.call(this.proxies,e)}var n=u.expectation.create(e);return f.call(this.expectations[e],n),n},restore:function(){var t=this.object;o(this.proxies,function(e){"function"==typeof t[e].restore&&t[e].restore()})},verify:function(){var t=this.expectations||{},n=[],r=[];return o(this.proxies,function(e){o(t[e],function(e){e.met()?f.call(r,e.toString()):f.call(n,e.toString())})}),this.restore(),0<n.length?u.expectation.fail(n.concat(r).join("\n")):0<r.length&&u.expectation.pass(n.concat(r).join("\n")),!0},invokeMethod:function(e,t,n){var r,o,i=this.expectations&&this.expectations[e]?this.expectations[e]:[],s=[],a=n||[];for(r=0;r<i.length;r+=1){h(i[r].expectedArguments||[],a,i[r].expectsExactArgCount)&&s.push(i[r])}for(r=0;r<s.length;r+=1)if(!s[r].met()&&s[r].allowsCall(t,n))return s[r].apply(t,n);var l=[],c=0;for(r=0;r<s.length;r+=1)s[r].allowsCall(t,n)?o=o||s[r]:c+=1;if(o&&0===c)return o.apply(t,n);for(r=0;r<i.length;r+=1)f.call(l,"    "+i[r].toString());l.unshift("Unexpected call: "+u.spyCall.toString.call({proxy:e,args:n})),u.expectation.fail(l.join("\n"))}});var i=u.timesInWords,e=Array.prototype.slice;function s(e){return"number"==typeof e.maxCalls&&e.callCount===e.maxCalls}function a(e,t){return n&&n.isMatcher(e)&&e.test(t)||!0}return u.expectation={minCalls:1,maxCalls:1,create:function(e){var t=u.extend(u.stub.create(),u.expectation);return delete t.create,t.method=e,t},invoke:function(e,t,n){return this.verifyCallAllowed(t,n),u.spy.invoke.apply(this,arguments)},atLeast:function(e){if("number"!=typeof e)throw new TypeError("'"+e+"' is not number");return this.limitsSet||(this.maxCalls=null,this.limitsSet=!0),this.minCalls=e,this},atMost:function(e){if("number"!=typeof e)throw new TypeError("'"+e+"' is not number");return this.limitsSet||(this.minCalls=null,this.limitsSet=!0),this.maxCalls=e,this},never:function(){return this.exactly(0)},once:function(){return this.exactly(1)},twice:function(){return this.exactly(2)},thrice:function(){return this.exactly(3)},exactly:function(e){if("number"!=typeof e)throw new TypeError("'"+e+"' is not a number");return this.atLeast(e),this.atMost(e)},met:function(){return!this.failed&&(!("number"==typeof(e=this).minCalls)||e.callCount>=e.minCalls);var e},verifyCallAllowed:function(e,t){if(s(this)&&(this.failed=!0,u.expectation.fail(this.method+" already called "+i(this.maxCalls))),"expectedThis"in this&&this.expectedThis!==e&&u.expectation.fail(this.method+" called with "+e+" as thisValue, expected "+this.expectedThis),"expectedArguments"in this){t||u.expectation.fail(this.method+" received no arguments, expected "+u.format(this.expectedArguments)),t.length<this.expectedArguments.length&&u.expectation.fail(this.method+" received too few arguments ("+u.format(t)+"), expected "+u.format(this.expectedArguments)),this.expectsExactArgCount&&t.length!==this.expectedArguments.length&&u.expectation.fail(this.method+" received too many arguments ("+u.format(t)+"), expected "+u.format(this.expectedArguments));for(var n=0,r=this.expectedArguments.length;n<r;n+=1)a(this.expectedArguments[n],t[n])||u.expectation.fail(this.method+" received wrong arguments "+u.format(t)+", didn't match "+this.expectedArguments.toString()),u.deepEqual(this.expectedArguments[n],t[n])||u.expectation.fail(this.method+" received wrong arguments "+u.format(t)+", expected "+u.format(this.expectedArguments))}},allowsCall:function(e,t){if(this.met()&&s(this))return!1;if("expectedThis"in this&&this.expectedThis!==e)return!1;if(!("expectedArguments"in this))return!0;if((t=t||[]).length<this.expectedArguments.length)return!1;if(this.expectsExactArgCount&&t.length!==this.expectedArguments.length)return!1;for(var n=0,r=this.expectedArguments.length;n<r;n+=1){if(!a(this.expectedArguments[n],t[n]))return!1;if(!u.deepEqual(this.expectedArguments[n],t[n]))return!1}return!0},withArgs:function(){return this.expectedArguments=e.call(arguments),this},withExactArgs:function(){return this.withArgs.apply(this,arguments),this.expectsExactArgCount=!0,this},on:function(e){return this.expectedThis=e,this},toString:function(){var e=(this.expectedArguments||[]).slice();this.expectsExactArgCount||f.call(e,"[...]");var t,n=u.spyCall.toString.call({proxy:this.method||"anonymous mock expectation",args:e}).replace(", [...","[, ...")+" "+function(e){var t=e.minCalls,n=e.maxCalls;if("number"==typeof t&&"number"==typeof n){var r=i(t);return t!==n&&(r="at least "+r+" and at most "+i(n)),r}return"number"==typeof t?"at least "+i(t):"at most "+i(n)}(this);return this.met()?"Expectation met: "+n:"Expected "+n+" ("+(0===(t=this.callCount)?"never called":"called "+i(t))+")"},verify:function(){return this.met()?u.expectation.pass(this.toString()):u.expectation.fail(this.toString()),!0},pass:function(e){u.assert.pass(e)},fail:function(e){var t=new Error(e);throw t.name="ExpectationError",t}},u.mock=r}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./times_in_words"),e("./call"),e("./extend"),e("./match"),e("./spy"),e("./stub"),e("./format"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){var t=[].push,a=Object.prototype.hasOwnProperty;function i(e){return e.fakes||(e.fakes=[]),e.fakes}function n(e,t){for(var n=i(e),r=0,o=n.length;r<o;r+=1)"function"==typeof n[r][t]&&n[r][t]()}function o(s){var e={verify:function(){n(this,"verify")},restore:function(){n(this,"restore"),function(e){for(var t=i(e);0<t.length;)t.splice(0,1)}(this)},reset:function(){n(this,"reset")},verifyAndRestore:function(){var t;try{this.verify()}catch(e){t=e}if(this.restore(),t)throw t},add:function(e){return t.call(i(this),e),e},spy:function(){return this.add(s.spy.apply(s,arguments))},stub:function(e,t,n){if(t){var r=e[t];if("function"!=typeof r){if(!a.call(e,t))throw new TypeError("Cannot stub non-existent own property "+t);return e[t]=n,this.add({restore:function(){e[t]=r}})}}if(!t&&e&&"object"==typeof e){var o=s.stub.apply(s,arguments);for(var i in o)"function"==typeof o[i]&&this.add(o[i]);return o}return this.add(s.stub.apply(s,arguments))},mock:function(){return this.add(s.mock.apply(s,arguments))},inject:function(e){var t=this;return e.spy=function(){return t.spy.apply(t,arguments)},e.stub=function(){return t.stub.apply(t,arguments)},e.mock=function(){return t.mock.apply(t,arguments)},e}};return s.collection=e}var r="undefined"!=typeof module&&module.exports&&"function"==typeof require;function s(e,t,n){var r=e("./util/core");e("./mock"),e("./spy"),e("./stub"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(s):r?s(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(){function i(e,t){var r=void 0!==lolex?lolex:t;e.useFakeTimers=function(){var e,t=Array.prototype.slice.call(arguments);e="string"==typeof t[0]?0:t.shift();var n=r.install(e||0,t);return n.restore=n.uninstall,n},e.clock={create:function(e){return r.createClock(e)}},e.timers={setTimeout:setTimeout,clearTimeout:clearTimeout,setImmediate:"undefined"!=typeof setImmediate?setImmediate:void 0,clearImmediate:"undefined"!=typeof clearImmediate?clearImmediate:void 0,setInterval:setInterval,clearInterval:clearInterval,Date:Date}}var e="undefined"!=typeof module&&module.exports&&"function"==typeof require;function t(e,t,n,r){var o=e("./core");i(o,r),n.exports=o}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):e?t(require,module.exports,module,require("lolex")):i(sinon)}(),void 0===sinon&&(this.sinon={}),function(){var n=[].push;function t(e){e.Event=function(e,t,n,r){this.initEvent(e,t,n,r)},e.Event.prototype={initEvent:function(e,t,n,r){this.type=e,this.bubbles=t,this.cancelable=n,this.target=r},stopPropagation:function(){},preventDefault:function(){this.defaultPrevented=!0}},e.ProgressEvent=function(e,t,n){this.initEvent(e,!1,!1,n),this.loaded="number"==typeof t.loaded?t.loaded:null,this.total="number"==typeof t.total?t.total:null,this.lengthComputable=!!t.total},e.ProgressEvent.prototype=new e.Event,e.ProgressEvent.prototype.constructor=e.ProgressEvent,e.CustomEvent=function(e,t,n){this.initEvent(e,!1,!1,n),this.detail=t.detail||null},e.CustomEvent.prototype=new e.Event,e.CustomEvent.prototype.constructor=e.CustomEvent,e.EventTarget={addEventListener:function(e,t){this.eventListeners=this.eventListeners||{},this.eventListeners[e]=this.eventListeners[e]||[],n.call(this.eventListeners[e],t)},removeEventListener:function(e,t){for(var n=this.eventListeners&&this.eventListeners[e]||[],r=0,o=n.length;r<o;++r)if(n[r]===t)return n.splice(r,1)},dispatchEvent:function(e){for(var t=e.type,n=this.eventListeners&&this.eventListeners[t]||[],r=0;r<n.length;r++)"function"==typeof n[r]?n[r].call(this,e):n[r].handleEvent(e);return!!e.defaultPrevented}}}var e="undefined"!=typeof module&&module.exports&&"function"==typeof require;function r(e){t(e("./core"))}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(r):e?r(require):t(sinon)}(),function(e){var n=setTimeout;function o(o){function i(e,t){var n=e+" threw exception: ";function r(){throw t.message=n+t.message,t}o.log(n+"["+t.name+"] "+t.message),t.stack&&o.log(t.stack),i.useImmediateExceptions?r():i.setTimeout(r,0)}i.useImmediateExceptions=!1,i.setTimeout=function(e,t){n(e,t)};var e={};return e.log=o.log=function(){},e.logError=o.logError=i,e}function t(e,t,n){var r=e("./util/core");n.exports=o(r)}var r="undefined"!=typeof module&&module.exports&&"function"==typeof require;"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):r?t(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),void 0===sinon&&(void 0===this?getGlobal().sinon={}:this.sinon={}),function(t){var o={XDomainRequest:t.XDomainRequest};function i(n){function r(){this.readyState=r.UNSENT,this.requestBody=null,this.requestHeaders={},this.status=0,this.timeout=null,"function"==typeof r.onCreate&&r.onCreate(this)}n.xdr=o,n.extend(r.prototype,n.EventTarget,{open:function(e,t){this.method=e,this.url=t,this.responseText=null,this.sendFlag=!1,this.readyStateChange(r.OPENED)},readyStateChange:function(e){this.readyState=e;var t="";switch(this.readyState){case r.UNSENT:case r.OPENED:break;case r.LOADING:this.sendFlag&&(t="onprogress");break;case r.DONE:t=this.isTimeout?"ontimeout":this.errorFlag||this.status<200||299<this.status?"onerror":"onload"}if(t&&"function"==typeof this[t])try{this[t]()}catch(e){n.logError("Fake XHR "+t+" handler",e)}},send:function(e){!function(e){if(e.readyState!==r.OPENED)throw new Error("INVALID_STATE_ERR");if(e.sendFlag)throw new Error("INVALID_STATE_ERR")}(this),/^(get|head)$/i.test(this.method)||(this.requestBody=e),this.requestHeaders["Content-Type"]="text/plain;charset=utf-8",this.errorFlag=!1,this.sendFlag=!0,this.readyStateChange(r.OPENED),"function"==typeof this.onSend&&this.onSend(this)},abort:function(){this.aborted=!0,this.responseText=null,this.errorFlag=!0,this.readyState>n.FakeXDomainRequest.UNSENT&&this.sendFlag&&(this.readyStateChange(n.FakeXDomainRequest.DONE),this.sendFlag=!1)},setResponseBody:function(e){!function(e){if(e.readyState===r.UNSENT)throw new Error("Request not sent");if(e.readyState===r.DONE)throw new Error("Request done")}(this),function(e){if("string"!=typeof e){var t=new Error("Attempted to respond to fake XDomainRequest with "+e+", which is not a string.");throw t.name="InvalidBodyException",t}}(e);var t=this.chunkSize||10,n=0;for(this.responseText="";this.readyStateChange(r.LOADING),this.responseText+=e.substring(n,n+t),(n+=t)<e.length;);this.readyStateChange(r.DONE)},respond:function(e,t,n){this.status="number"==typeof e?e:200,this.setResponseBody(n||"")},simulatetimeout:function(){this.status=0,this.isTimeout=!0,this.responseText=void 0,this.readyStateChange(r.DONE)}}),n.extend(r,{UNSENT:0,OPENED:1,LOADING:3,DONE:4}),n.useFakeXDomainRequest=function(){return n.FakeXDomainRequest.restore=function(e){o.supportsXDR&&(t.XDomainRequest=o.GlobalXDomainRequest),delete n.FakeXDomainRequest.restore,!0!==e&&delete n.FakeXDomainRequest.onCreate},o.supportsXDR&&(t.XDomainRequest=n.FakeXDomainRequest),n.FakeXDomainRequest},n.FakeXDomainRequest=r}o.GlobalXDomainRequest=t.XDomainRequest,o.supportsXDR=void 0!==o.GlobalXDomainRequest,o.workingXDR=!!o.supportsXDR&&o.GlobalXDomainRequest;var e="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./core");e("../extend"),e("./event"),e("../log_error"),i(r),n.exports=r}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):e?n(require,module.exports,module):i(sinon)}("undefined"!=typeof global?global:self),function(e,t){var n,i="undefined"!=typeof ProgressEvent,r="undefined"!=typeof CustomEvent,s="undefined"!=typeof FormData,a="undefined"!=typeof ArrayBuffer,l=function(){try{return!!new Blob}catch(e){return!1}}(),c={XMLHttpRequest:t.XMLHttpRequest};c.GlobalXMLHttpRequest=t.XMLHttpRequest,c.GlobalActiveXObject=t.ActiveXObject,c.supportsActiveX=void 0!==c.GlobalActiveXObject,c.supportsXHR=void 0!==c.GlobalXMLHttpRequest,c.workingXHR=void 0!==(n=t).XMLHttpRequest?n.XMLHttpRequest:!(void 0===n.ActiveXObject)&&function(){return new n.ActiveXObject("MSXML2.XMLHTTP.3.0")},c.supportsCORS=c.supportsXHR&&"withCredentials"in new c.GlobalXMLHttpRequest;var u={"Accept-Charset":!0,"Accept-Encoding":!0,Connection:!0,"Content-Length":!0,Cookie:!0,Cookie2:!0,"Content-Transfer-Encoding":!0,Date:!0,Expect:!0,Host:!0,"Keep-Alive":!0,Referer:!0,TE:!0,Trailer:!0,"Transfer-Encoding":!0,Upgrade:!0,"User-Agent":!0,Via:!0};function o(){this.eventListeners={abort:[],error:[],load:[],loadend:[],progress:[]}}function f(){this.readyState=f.UNSENT,this.requestHeaders={},this.requestBody=null,this.status=0,this.statusText="",this.upload=new o,this.responseType="",this.response="",c.supportsCORS&&(this.withCredentials=!1);var r=this,e=["loadstart","load","abort","error","loadend"];function t(n){r.addEventListener(n,function(e){var t=r["on"+n];t&&"function"==typeof t&&t.call(this,e)})}for(var n=e.length-1;0<=n;n--)t(e[n]);"function"==typeof f.onCreate&&f.onCreate(this)}function h(e){if(e.readyState!==f.OPENED)throw new Error("INVALID_STATE_ERR");if(e.sendFlag)throw new Error("INVALID_STATE_ERR")}function p(e,t){for(var n in t=t.toLowerCase(),e)if(n.toLowerCase()===t)return n;return null}function d(e,t){if(e)for(var n=0,r=e.length;n<r;n+=1)t(e[n])}o.prototype.addEventListener=function(e,t){this.eventListeners[e].push(t)},o.prototype.removeEventListener=function(e,t){for(var n=this.eventListeners[e]||[],r=0,o=n.length;r<o;++r)if(n[r]===t)return n.splice(r,1)},o.prototype.dispatchEvent=function(e){for(var t,n=this.eventListeners[e.type]||[],r=0;null!=(t=n[r]);r++)t(e)};var y=function(e,t,n){switch(n.length){case 0:return e[t]();case 1:return e[t](n[0]);case 2:return e[t](n[0],n[1]);case 3:return e[t](n[0],n[1],n[2]);case 4:return e[t](n[0],n[1],n[2],n[3]);case 5:return e[t](n[0],n[1],n[2],n[3],n[4])}};f.filters=[],f.addFilter=function(e){this.filters.push(e)};var m=/MSIE 6/;function g(e){for(var t=new ArrayBuffer(e.length),n=new Uint8Array(t),r=0;r<e.length;r++){var o=e.charCodeAt(r);if(256<=o)throw new TypeError("arraybuffer or blob responseTypes require binary string, invalid character "+e[r]+" found.");n[r]=o}return t}function v(e){return!e||/(text\/xml)|(application\/xml)|(\+xml)/.test(e)}function b(e){""===e.responseType||"text"===e.responseType?e.response=e.responseText="":e.response=e.responseText=null,e.responseXML=null}function w(o){o.xhr=c,o.extend(f.prototype,o.EventTarget,{async:!0,open:function(e,t,n,r,o){if(this.method=e,this.url=t,this.async="boolean"!=typeof n||n,this.username=r,this.password=o,b(this),this.requestHeaders={},!(this.sendFlag=!1)===f.useFilters){var i=arguments;if(function(e,t){for(var n=0;n<e.length;n++)if(!0===t(e[n]))return!0;return!1}(f.filters,function(e){return e.apply(this,i)}))return f.defake(this,arguments)}this.readyStateChange(f.OPENED)},readyStateChange:function(e){this.readyState=e;var t,n,r=new o.Event("readystatechange",!1,!1,this);if("function"==typeof this.onreadystatechange)try{this.onreadystatechange(r)}catch(e){o.logError("Fake XHR onreadystatechange handler",e)}this.readyState===f.DONE&&(n={loaded:this.progress||0,total:this.progress||0},t=0===this.status?this.aborted?"abort":"error":"load",i&&(this.upload.dispatchEvent(new o.ProgressEvent("progress",n,this)),this.upload.dispatchEvent(new o.ProgressEvent(t,n,this)),this.upload.dispatchEvent(new o.ProgressEvent("loadend",n,this))),this.dispatchEvent(new o.ProgressEvent("progress",n,this)),this.dispatchEvent(new o.ProgressEvent(t,n,this)),this.dispatchEvent(new o.ProgressEvent("loadend",n,this))),this.dispatchEvent(r)},setRequestHeader:function(e,t){if(h(this),u[e]||/^(Sec-|Proxy-)/.test(e))throw new Error('Refused to set unsafe header "'+e+'"');this.requestHeaders[e]?this.requestHeaders[e]+=","+t:this.requestHeaders[e]=t},setResponseHeaders:function(e){for(var t in function(e){if(e.readyState!==f.OPENED)throw new Error("INVALID_STATE_ERR - "+e.readyState)}(this),this.responseHeaders={},e)e.hasOwnProperty(t)&&(this.responseHeaders[t]=e[t]);this.async?this.readyStateChange(f.HEADERS_RECEIVED):this.readyState=f.HEADERS_RECEIVED},send:function(e){if(h(this),!/^(get|head)$/i.test(this.method)){var t=p(this.requestHeaders,"Content-Type");if(this.requestHeaders[t]){var n=this.requestHeaders[t].split(";");this.requestHeaders[t]=n[0]+";charset=utf-8"}else!s||e instanceof FormData||(this.requestHeaders["Content-Type"]="text/plain;charset=utf-8");this.requestBody=e}this.errorFlag=!1,this.sendFlag=this.async,b(this),this.readyStateChange(f.OPENED),"function"==typeof this.onSend&&this.onSend(this),this.dispatchEvent(new o.Event("loadstart",!1,!1,this))},abort:function(){this.aborted=!0,b(this),this.errorFlag=!0,this.requestHeaders={},this.responseHeaders={},this.readyState>f.UNSENT&&this.sendFlag&&(this.readyStateChange(f.DONE),this.sendFlag=!1),this.readyState=f.UNSENT},error:function(){b(this),this.errorFlag=!0,this.requestHeaders={},this.responseHeaders={},this.readyStateChange(f.DONE)},getResponseHeader:function(e){return this.readyState<f.HEADERS_RECEIVED?null:/^Set-Cookie2?$/i.test(e)?null:(e=p(this.responseHeaders,e),this.responseHeaders[e]||null)},getAllResponseHeaders:function(){if(this.readyState<f.HEADERS_RECEIVED)return"";var e="";for(var t in this.responseHeaders)this.responseHeaders.hasOwnProperty(t)&&!/^Set-Cookie2?$/i.test(t)&&(e+=t+": "+this.responseHeaders[t]+"\r\n");return e},setResponseBody:function(e){!function(e){if(e.readyState===f.DONE)throw new Error("Request done")}(this),function(e){if(e.async&&e.readyState!==f.HEADERS_RECEIVED)throw new Error("No headers received")}(this),function(e){if("string"!=typeof e){var t=new Error("Attempted to respond to fake XMLHttpRequest with "+e+", which is not a string.");throw t.name="InvalidBodyException",t}}(e);var t=this.getResponseHeader("Content-Type"),n=""===this.responseType||"text"===this.responseType;if(b(this),this.async)for(var r=this.chunkSize||10,o=0;this.readyStateChange(f.LOADING),n&&(this.responseText=this.response+=e.substring(o,o+r)),(o+=r)<e.length;);this.response=function(e,t,n){if(""===e||"text"===e)return n;if(a&&"arraybuffer"===e)return g(n);if("json"===e)try{return JSON.parse(n)}catch(e){return null}else{if(l&&"blob"===e){var r={};return t&&(r.type=t),new Blob([g(n)],r)}if("document"===e)return v(t)?f.parseXML(n):null}throw new Error("Invalid responseType "+e)}(this.responseType,t,e),n&&(this.responseText=this.response),"document"===this.responseType?this.responseXML=this.response:""===this.responseType&&v(t)&&(this.responseXML=f.parseXML(this.responseText)),this.progress=e.length,this.readyStateChange(f.DONE)},respond:function(e,t,n){this.status="number"==typeof e?e:200,this.statusText=f.statusCodes[this.status],this.setResponseHeaders(t||{}),this.setResponseBody(n||"")},uploadProgress:function(e){i&&this.upload.dispatchEvent(new o.ProgressEvent("progress",e))},downloadProgress:function(e){i&&this.dispatchEvent(new o.ProgressEvent("progress",e))},uploadError:function(e){r&&this.upload.dispatchEvent(new o.CustomEvent("error",{detail:e}))}}),o.extend(f,{UNSENT:0,OPENED:1,HEADERS_RECEIVED:2,LOADING:3,DONE:4}),o.useFakeXMLHttpRequest=function(){return f.restore=function(e){c.supportsXHR&&(t.XMLHttpRequest=c.GlobalXMLHttpRequest),c.supportsActiveX&&(t.ActiveXObject=c.GlobalActiveXObject),delete f.restore,!0!==e&&delete f.onCreate},c.supportsXHR&&(t.XMLHttpRequest=f),c.supportsActiveX&&(t.ActiveXObject=function(e){return"Microsoft.XMLHTTP"===e||/^Msxml2\.XMLHTTP/i.test(e)?new f:new c.GlobalActiveXObject(e)}),f},o.FakeXMLHttpRequest=f}f.defake=function(t,e){var n=new c.workingXHR;d(["open","setRequestHeader","send","abort","getResponseHeader","getAllResponseHeaders","addEventListener","overrideMimeType","removeEventListener"],function(e){t[e]=function(){return y(n,e,arguments)}});var r=function(e){d(e,function(e){try{t[e]=n[e]}catch(e){if(!m.test(navigator.userAgent))throw e}})},o=function(){t.readyState=n.readyState,n.readyState>=f.HEADERS_RECEIVED&&r(["status","statusText"]),n.readyState>=f.LOADING&&r(["responseText","response"]),n.readyState===f.DONE&&r(["responseXML"]),t.onreadystatechange&&t.onreadystatechange.call(t,{target:t})};if(n.addEventListener){for(var i in t.eventListeners)t.eventListeners.hasOwnProperty(i)&&d(t.eventListeners[i],function(e){n.addEventListener(i,e)});n.addEventListener("readystatechange",o)}else n.onreadystatechange=o;y(n,"open",e)},f.useFilters=!1,f.parseXML=function(e){if(""!==e)try{if("undefined"!=typeof DOMParser)return(new DOMParser).parseFromString(e,"text/xml");var t=new window.ActiveXObject("Microsoft.XMLDOM");return t.async="false",t.loadXML(e),t}catch(e){}return null},f.statusCodes={100:"Continue",101:"Switching Protocols",200:"OK",201:"Created",202:"Accepted",203:"Non-Authoritative Information",204:"No Content",205:"Reset Content",206:"Partial Content",207:"Multi-Status",300:"Multiple Choice",301:"Moved Permanently",302:"Found",303:"See Other",304:"Not Modified",305:"Use Proxy",307:"Temporary Redirect",400:"Bad Request",401:"Unauthorized",402:"Payment Required",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",406:"Not Acceptable",407:"Proxy Authentication Required",408:"Request Timeout",409:"Conflict",410:"Gone",411:"Length Required",412:"Precondition Failed",413:"Request Entity Too Large",414:"Request-URI Too Long",415:"Unsupported Media Type",416:"Requested Range Not Satisfiable",417:"Expectation Failed",422:"Unprocessable Entity",500:"Internal Server Error",501:"Not Implemented",502:"Bad Gateway",503:"Service Unavailable",504:"Gateway Timeout",505:"HTTP Version Not Supported"};var x="undefined"!=typeof module&&module.exports&&"function"==typeof require;function C(e,t,n){var r=e("./core");e("../extend"),e("./event"),e("../log_error"),w(r),n.exports=r}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(C):x?C(require,module.exports,module):e&&w(e)}("object"==typeof sinon&&sinon,"undefined"!=typeof global?global:self),function(){var o=[].push;function i(e){var t=e;if("[object Array]"!==Object.prototype.toString.call(e)&&(t=[200,{},e]),"string"!=typeof t[2])throw new TypeError("Fake server response body should be string, but was "+typeof t[2]);return t}var e="undefined"!=typeof window?window.location:{},h=new RegExp("^"+e.protocol+"//"+e.host);function s(e,t){var n,r,o,i,s,a,l,c=t.url;if(/^https?:\/\//.test(c)&&!h.test(c)||(c=c.replace(h,"")),n=e,r=this.getHTTPMethod(t),o=c,i=n.method,s=!i||i.toLowerCase()===r.toLowerCase(),a=n.url,l=!a||a===o||"function"==typeof a.test&&a.test(o),s&&l){if("function"==typeof e.response){var u=e.url,f=[t].concat(u&&"function"==typeof u.exec?u.exec(c).slice(1):[]);return e.response.apply(e,f)}return!0}return!1}function a(r){r.fakeServer={create:function(e){var t=r.create(this);return t.configure(e),r.xhr.supportsCORS?this.xhr=r.useFakeXMLHttpRequest():this.xhr=r.useFakeXDomainRequest(),t.requests=[],this.xhr.onCreate=function(e){t.addRequest(e)},t},configure:function(e){var t,n={autoRespond:!0,autoRespondAfter:!0,respondImmediately:!0,fakeHTTPMethods:!0};for(t in e=e||{})n.hasOwnProperty(t)&&e.hasOwnProperty(t)&&(this[t]=e[t])},addRequest:function(e){var t=this;o.call(this.requests,e),e.onSend=function(){t.handleRequest(this),t.respondImmediately?t.respond():t.autoRespond&&!t.responding&&(setTimeout(function(){t.responding=!1,t.respond()},t.autoRespondAfter||10),t.responding=!0)}},getHTTPMethod:function(e){if(this.fakeHTTPMethods&&/post/i.test(e.method)){var t=(e.requestBody||"").match(/_method=([^\b;]+)/);return t?t[1]:e.method}return e.method},handleRequest:function(e){e.async?(this.queue||(this.queue=[]),o.call(this.queue,e)):this.processRequest(e)},log:function(e,t){var n;n="Request:\n"+r.format(t)+"\n\n",n+="Response:\n"+r.format(e)+"\n\n",r.log(n)},respondWith:function(e,t,n){1!==arguments.length||"function"==typeof e?(this.responses||(this.responses=[]),1===arguments.length&&(n=e,t=e=null),2===arguments.length&&(n=t,t=e,e=null),o.call(this.responses,{method:e,url:t,response:"function"==typeof n?n:i(n)})):this.response=i(e)},respond:function(){0<arguments.length&&this.respondWith.apply(this,arguments);for(var e=this.queue||[],t=e.splice(0,e.length),n=0;n<t.length;n++)this.processRequest(t[n])},processRequest:function(e){try{if(e.aborted)return;var t=this.response||[404,{},""];if(this.responses)for(var n=this.responses.length-1;0<=n;n--)if(s.call(this,this.responses[n],e)){t=this.responses[n].response;break}4!==e.readyState&&(this.log(t,e),e.respond(t[0],t[1],t[2]))}catch(e){r.logError("Fake server request processing",e)}},restore:function(){return this.xhr.restore&&this.xhr.restore.apply(this.xhr,arguments)}}}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./core");e("./fake_xdomain_request"),e("./fake_xml_http_request"),e("../format"),a(r),n.exports=r}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):a(sinon)}(),function(){function n(t){function e(){}e.prototype=t.fakeServer,t.fakeServerWithClock=new e,t.fakeServerWithClock.addRequest=function(e){if(e.async&&("object"==typeof setTimeout.clock?this.clock=setTimeout.clock:(this.clock=t.useFakeTimers(),this.resetClock=!0),!this.longestTimeout)){var n=this.clock.setTimeout,r=this.clock.setInterval,o=this;this.clock.setTimeout=function(e,t){return o.longestTimeout=Math.max(t,o.longestTimeout||0),n.apply(this,arguments)},this.clock.setInterval=function(e,t){return o.longestTimeout=Math.max(t,o.longestTimeout||0),r.apply(this,arguments)}}return t.fakeServer.addRequest.call(this,e)},t.fakeServerWithClock.respond=function(){var e=t.fakeServer.respond.apply(this,arguments);return this.clock&&(this.clock.tick(this.longestTimeout||0),this.longestTimeout=0,this.resetClock&&(this.clock.restore(),this.resetClock=!1)),e},t.fakeServerWithClock.restore=function(){return this.clock&&this.clock.restore(),t.fakeServer.restore.apply(this,arguments)}}var e="undefined"!=typeof module&&module.exports&&"function"==typeof require;function t(e){var t=e("./core");e("./fake_server"),e("./fake_timers"),n(t)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(t):e?t(require):n(sinon)}(),function(e){function o(c){var o=[].push;function u(e,t,n,r){r&&(!t.injectInto||n in t.injectInto?o.call(e.args,r):(t.injectInto[n]=r,e.injectedKeys.push(n)))}return c.sandbox=c.extend(c.create(c.collection),{useFakeTimers:function(){return this.clock=c.useFakeTimers.apply(c,arguments),this.add(this.clock)},serverPrototype:c.fakeServer,useFakeServer:function(){var e=this.serverPrototype||c.fakeServer;return e&&e.create?(this.server=e.create(),this.add(this.server)):null},inject:function(e){return c.collection.inject.call(this,e),this.clock&&(e.clock=this.clock),this.server&&(e.server=this.server,e.requests=this.server.requests),e.match=c.match,e},restore:function(){if(arguments.length)throw new Error("sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()");c.collection.restore.apply(this,arguments),this.restoreContext()},restoreContext:function(){if(this.injectedKeys){for(var e=0,t=this.injectedKeys.length;e<t;e++)delete this.injectInto[this.injectedKeys[e]];this.injectedKeys=[]}},create:function(e){if(!e)return c.create(c.sandbox);var t,n,r,o,i=(t=e,n=c.create(c.sandbox),t.useFakeServer&&("object"==typeof t.useFakeServer&&(n.serverPrototype=t.useFakeServer),n.useFakeServer()),t.useFakeTimers&&("object"==typeof t.useFakeTimers?n.useFakeTimers.apply(n,t.useFakeTimers):n.useFakeTimers()),n);i.args=i.args||[],i.injectedKeys=[],i.injectInto=e.injectInto;var s=i.inject({});if(e.properties)for(var a=0,l=e.properties.length;a<l;a++)u(i,e,r=e.properties[a],o=s[r]||"sandbox"===r&&i);else u(i,e,"sandbox",o);return i},match:c.match}),c.sandbox.useFakeXMLHttpRequest=c.sandbox.useFakeServer,c.sandbox}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./extend"),e("./util/fake_server_with_clock"),e("./util/fake_timers"),e("./collection"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e){function o(a){var l=Array.prototype.slice;function e(s){var e=typeof s;if("function"!==e)throw new TypeError("sinon.test needs to wrap a test function, got "+e);function t(){var e=a.getConfig(a.config);e.injectInto=e.injectIntoThis&&this||e.injectInto;var t,n,r=a.sandbox.create(e),o=l.call(arguments),i=o.length&&o[o.length-1];"function"==typeof i&&(o[o.length-1]=function(e){e?r.restore():r.verifyAndRestore(),i(e)});try{n=s.apply(this,o.concat(r.args))}catch(e){t=e}if(void 0!==t)throw r.restore(),t;return"function"!=typeof i&&r.verifyAndRestore(),n}return s.length?function(e){return t.apply(this,arguments)}:t}return e.config={injectIntoThis:!0,injectInto:null,properties:["spy","stub","mock","clock","server","requests"],useFakeTimers:!0,useFakeServer:!0},a.test=e}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./sandbox"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon||null),function(e){function u(n,r,o){return function(){var t,e;r&&r.apply(this,arguments);try{e=n.apply(this,arguments)}catch(e){t=e}if(o&&o.apply(this,arguments),t)throw t;return e}}function o(c){function e(e,t){if(!e||"object"!=typeof e)throw new TypeError("sinon.testCase needs an object with test functions");t=t||"test";var n,r,o,i=new RegExp("^"+t),s={},a=e.setUp,l=e.tearDown;for(n in e)e.hasOwnProperty(n)&&!/^(setUp|tearDown)$/.test(n)&&("function"==typeof(r=e[n])&&i.test(n)?(o=r,(a||l)&&(o=u(r,a,l)),s[n]=c.test(o)):s[n]=e[n]);return s}return c.testCase=e}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function n(e,t,n){var r=e("./util/core");e("./test"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(n):t?n(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon),function(e,n){var l=Array.prototype.slice;function o(o){var i;function s(){for(var e,t=0,n=arguments.length;t<n;++t)(e=arguments[t])||i.fail("fake is not a spy"),e.proxy&&e.proxy.isSinonProxy?s(e.proxy):("function"!=typeof e&&i.fail(e+" is not a function"),"function"!=typeof e.getCall&&i.fail(e+" is not stubbed"))}function a(e,t){((e=e||n).fail||i.fail).call(e,t)}function e(n,r,o){2===arguments.length&&(o=r,r=n),i[n]=function(e){s(e);var t=l.call(arguments,1);!function(e,t){switch(e){case"notCalled":case"called":case"calledOnce":case"calledTwice":case"calledThrice":0!==t.length&&i.fail(e+" takes 1 argument but was called with "+(t.length+1)+" arguments")}}(n,t);("function"==typeof r?!r(e):"function"==typeof e[r]?!e[r].apply(e,t):!e[r])?a(this,(e.printf||e.proxy.printf).apply(e,[o].concat(t))):i.pass(n)}}return i={failException:"AssertError",fail:function(e){var t=new Error(e);throw t.name=this.failException||i.failException,t},pass:function(){},callOrder:function(){s.apply(null,arguments);var e="",t="";if(o.calledInOrder(arguments))i.pass("callOrder");else{try{e=[].join.call(arguments,", ");for(var n=l.call(arguments),r=n.length;r;)n[--r].called||n.splice(r,1);t=o.orderByFirstCall(n).join(", ")}catch(e){}a(this,"expected "+e+" to be called in order but were called as "+t)}},callCount:function(e,t){if(s(e),e.callCount!==t){var n="expected %n to be called "+o.timesInWords(t)+" but was called %c%C";a(this,e.printf(n))}else i.pass("callCount")},expose:function(e,t){if(!e)throw new TypeError("target is null or undefined");var n,r,o=t||{},i=void 0===o.prefix?"assert":o.prefix,s=void 0===o.includeFail||!!o.includeFail;for(var a in this)"expose"===a||!s&&/^(fail)/.test(a)||(e[(n=i,r=a,!n||/^fail/.test(r)?r:n+r.slice(0,1).toUpperCase()+r.slice(1))]=this[a]);return e},match:function(e,t){o.match(t).test(e)?i.pass("match"):a(this,["expected value to match","    expected = "+o.format(t),"    actual = "+o.format(e)].join("\n"))}},e("called","expected %n to have been called at least once but was never called"),e("notCalled",function(e){return!e.called},"expected %n to not have been called but was called %c%C"),e("calledOnce","expected %n to be called once but was called %c%C"),e("calledTwice","expected %n to be called twice but was called %c%C"),e("calledThrice","expected %n to be called thrice but was called %c%C"),e("calledOn","expected %n to be called with %1 as this but was called with %t"),e("alwaysCalledOn","expected %n to always be called with %1 as this but was called with %t"),e("calledWithNew","expected %n to be called with new"),e("alwaysCalledWithNew","expected %n to always be called with new"),e("calledWith","expected %n to be called with arguments %*%C"),e("calledWithMatch","expected %n to be called with match %*%C"),e("alwaysCalledWith","expected %n to always be called with arguments %*%C"),e("alwaysCalledWithMatch","expected %n to always be called with match %*%C"),e("calledWithExactly","expected %n to be called with exact arguments %*%C"),e("alwaysCalledWithExactly","expected %n to always be called with exact arguments %*%C"),e("neverCalledWith","expected %n to never be called with arguments %*%C"),e("neverCalledWithMatch","expected %n to never be called with match %*%C"),e("threw","%n did not throw exception%C"),e("alwaysThrew","%n did not always throw exception%C"),o.assert=i}var t="undefined"!=typeof module&&module.exports&&"function"==typeof require;function r(e,t,n){var r=e("./util/core");e("./match"),e("./format"),n.exports=o(r)}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(r):t?r(require,module.exports,module):e&&o(e)}("object"==typeof sinon&&sinon,"undefined"!=typeof global?global:self),sinon});
