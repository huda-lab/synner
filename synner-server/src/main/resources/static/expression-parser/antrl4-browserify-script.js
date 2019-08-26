var antlr4 = require('../node_modules/antlr4/index');
var ECMAScriptLexer = require('./ECMAScriptLexer');
var ECMAScriptParser = require('./ECMAScriptParser');
var ECMAScriptListener = require('./ECMAScriptListener');
var ECMAScriptVisitor = require('./ECMAScriptVisitor');

var listener = ECMAScriptListener(antlr4);
var visitor = ECMAScriptVisitor(antlr4);

exports.ExpressionParser = {
  ECMAScriptLexer: ECMAScriptLexer(antlr4),
  ECMAScriptParser: ECMAScriptParser(antlr4, listener, visitor),
  ECMAScriptVisitor: visitor,
  ECMAScriptListener: listener
};