if (!window.BGProcess) { BGProcess = {}; }
if (!BGProcess.Postscript) { BGProcess.Postscript = {}; }

BGProcess.Postscript.Parser = function() {
    function listener() {
        var callbacks = [];
        return {
            add: function(f) { callbacks.push(f); },
            invoker: function() {
                return function(arg) {
                    var i = 0;
                    for (; i < callbacks.length; i += 1) {
                        callbacks[i](arg);
                    }
                };
            }
        };
    }

    var listening = {
            deref: listener(),
            comment: listener(),
            whitespace: listener(),
            newline: listener(),
            literal: listener(),
            num: listener(),
            str: listener(),
            startBlock: listener(),
            endBlock: listener()
        };

    function terminal(pattern, action) {
        return function (doc) {
            var match;
            if (match = doc.match(pattern)) {
                action(match.toString());
                return doc.substr(match.toString().length);
            }

            return false;
        };
    }
    function choiceOf(things) {
        return function(doc) {
            var i, ret;
            for (i = 0; i < things.length; i += 1) {
                ret = things[i](doc);
                if (ret !== false) { return ret; }
            }
            return false;
        };
    }
    function many(thing) {
        return function(doc) {
            var step = doc;
            while (step !== false) {
              doc = step;
              step = thing(doc);
            }
            return doc;
        };
    }
            
    return {
        listen: function(token, action) {
            listening[token].add(action);
            return this;
        },

        parse: function(doc) {
            var step, grammar = {};

            grammar.deref = terminal(/^[a-zA-Z][\w\-]+/, listening.deref.invoker());
            grammar.comment = terminal(/^%.*/, listening.comment.invoker());
            grammar.whitespace = terminal(/^\s+/, listening.whitespace.invoker());
            grammar.newline = terminal(/^\n/, listening.newline.invoker());
            grammar.literal = terminal(/^\/[a-zA-Z][\w\-]+/, listening.literal.invoker());
            grammar.num = terminal(/^-?(?:\.\d+|\d+\.\d+|\d+)/, listening.num.invoker());
            grammar.str = terminal(/^\([^\)]+\)/, listening.str.invoker());
            grammar.startBlock = terminal(/^\{/, listening.startBlock.invoker());
            grammar.endBlock = terminal(/^}/, listening.endBlock.invoker());

            grammar.procedure = function(doc) {
                var proc = [], step = doc;
                doc = grammar.startBlock(doc, proc);
                if (doc !== false) {
                  doc = many(grammar.command)(doc, proc);
                  doc = grammar.endBlock(doc, proc);
                  return doc;
                }
                return false;
            };
            grammar.command = choiceOf([grammar.comment, 
                                        grammar.newline,
                                        grammar.whitespace, 
                                        grammar.literal, 
                                        grammar.num, 
                                        grammar.str, 
                                        grammar.deref, 
                                        grammar.procedure]);

            while (doc !== '') {
                step = doc;
                doc = grammar.command(doc);

                if (doc === false) {
                    throw "error parsing document <" + step + ">";
                }
            }
        }
    };
};
