if (!window.BGProcess) { BGProcess = {}; }
if (!BGProcess.Postscript) { BGProcess.Postscript = {}; }

BGProcess.Postscript.PrettyPrint = function() {
    function black() { return function(p) { return p; }; };
    function color(c) { return function(p) { return "<span style='color: " + c + "'>" + p + "</span>"; }; }
    return {
        prettyPrint: function(doc) {
            var printed = "<div><div>1:&nbsp;",
                lineNumber = 1,
                parser = BGProcess.Postscript.Parser();

            function print(f) { return function(p) { printed += f(p); } }

            parser.listen('deref', print(function(t) { return "<span style='font-weight:bold; color: green'>" + t + "</span>"; }))
                  .listen('comment', print(color('cyan')))
                  .listen('whitespace', print(function(t) { return t.replace(/\s/g, "&nbsp;"); }))
                  .listen('newline', function(t) { lineNumber += 1; printed += "</div><div>" + lineNumber + ":&nbsp;"; })
                  .listen('literal', print(color('orange')))
                  .listen('num', print(black()))
                  .listen('str', print(color('red')))
                  .listen('startBlock', print(black()))
                  .listen('endBlock', print(black()))
                  .parse(doc);

            return printed + "</div></div>";
        }
    };
};
