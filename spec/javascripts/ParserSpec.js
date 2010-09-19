describe("Parser", function() {
  var stream, parser;

  function watch(type) {
    return function(m) { stream.push(type + "(" + m + ")"); };
  }

  function inEachOfTheseCasesIt(msg, datapoints) {
    var i = 0;
    for (; i < datapoints.length; i += 1) {
      (function(scenario) {
        it(msg + " <" + scenario[0] + ">", function() { 
          parser.parse(scenario[0]);
          expect(stream).toEqual(scenario[1]);
        });
      }(datapoints[i]));
    }
  }

  function theseCasesCauseParseErrors(datapoints) {
    var i = 0;
    for (; i < datapoints.length; i += 1) {
      (function(scenario) {
        it("it should error with <" + scenario + ">", function() { 
          expect(function() {
            parser.parse(scenario);
          }).toThrow("error parsing document <" + scenario + ">");
        });
      }(datapoints[i]));
    }
  }

  beforeEach(function() { 
    stream = []; 
    parser = BGProcess.Postscript.Parser();

    parser.listen('deref', watch('deref'));
    parser.listen('comment', watch('comment'));
    parser.listen('whitespace', watch('whitespace'));
    parser.listen('newline', watch('newline'));
    parser.listen('literal', watch('literal'));
    parser.listen('num', watch('num'));
    parser.listen('str', watch('str'));
    parser.listen('startBlock', watch('startBlock'));
    parser.listen('endBlock', watch('endBlock'));

  });

  it("parses an empty file", function() {
    parser.parse("");

    expect(stream).toEqual([]);
  });

  inEachOfTheseCasesIt("parses numbers",
    [["1",    ["num(1)"]],
     ["1.0",  ["num(1.0)"]],
     [".1",   ["num(.1)"]],
     ["1 .1", ["num(1)", "whitespace( )", "num(.1)"]],
     ["-1.1", ["num(-1.1)"]]]);

  inEachOfTheseCasesIt("parses comments",
    [["% comment\n1",    ["comment(% comment)", "newline(\n)", "num(1)"]]]);

  inEachOfTheseCasesIt("parses literals",
    [["/literal",    ["literal(/literal)"]],
     ["/a7-655",    ["literal(/a7-655)"]],
     ["/a7_655",    ["literal(/a7_655)"]]]);

  theseCasesCauseParseErrors(
    ["/7lit"]);
});
