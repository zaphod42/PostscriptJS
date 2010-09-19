describe("Dictionary", function() {
  var dictionary;

  beforeEach(function() {
    dictionary = BGProcess.Postscript.Dictionary();
  });

  it("has undefined as the default for values", function() {
    expect(dictionary.lookup('a')).toEqual(undefined);
  });

  it("looks up a value that has been set", function() {
    dictionary.define('a', 1);

    expect(dictionary.lookup('a')).toEqual(1);
  });

  it("looks to the elder dictionary for things it does not know", function() {
    var child = BGProcess.Postscript.Dictionary(dictionary);

    dictionary.define('a', 1);

    expect(child.lookup('a')).toEqual(1);
  });
});
