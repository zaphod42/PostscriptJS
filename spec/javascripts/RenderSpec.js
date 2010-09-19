describe("Render", function() {
  var renderer; 

  function render(ps) {
    var printed = [];

    renderer.render(ps, function(page){ printed.push(page); });

    return printed;
  }

  function theEvaluationOf(ps) {
    var printed = render("1 1 moveto " + ps + " show showpage");

    return printed[0].fillText.mostRecentCall.args[0];
  }

  beforeEach(function() {
    renderer = BGProcess.Postscript.Render(BGProcess.Postscript.Parser(), function() {
      var canvas = BGProcess.Postscript.CanvasSheet();
      for (var method in canvas) { 
        if (canvas.hasOwnProperty(method)) {
          spyOn(canvas, method);
        }
      }
      return canvas;
    });
  });

  it("prints a string with the selected font", function() {
    var printed = render("/Courier 20 selectfont 72 500 moveto (Hello world!) show showpage");

    expect(printed[0].setFont).toHaveBeenCalledWith("normal 20px courier");
    expect(printed[0].moveTo).toHaveBeenCalledWith(72, 500);
    expect(printed[0].fillText).toHaveBeenCalledWith("Hello world!", 72, 500);
  });

  it("moves relative to the current cursor with rmoveto", function() {
    var printed = render("72 500 moveto 8 50 rmoveto showpage");

    expect(printed[0].moveTo).toHaveBeenCalledWith(80, 550);
  });

  it("does something", function() {
    var printed = render("/DrawAnX\n{ 3 3 rmoveto -6 -6 rlineto\n 0 6 rmoveto 6 -6 rlineto\n stroke } def 50 50 moveto DrawAnX showpage");

    expect(printed[0].moveTo).toHaveBeenCalledWith(50, 50);

    expect(printed[0].moveTo).toHaveBeenCalledWith(53, 53);
    expect(printed[0].lineTo).toHaveBeenCalledWith(47, 47);

    expect(printed[0].moveTo).toHaveBeenCalledWith(47, 53);
    expect(printed[0].lineTo).toHaveBeenCalledWith(53, 47);
  });

  it("sets grayscale colors", function() {
    var printed = render("0.5 setgray showpage");

    expect(printed[0].setStrokeStyle).toHaveBeenCalledWith("rgba(127, 127, 127, 1.0)");
    expect(printed[0].setFillStyle).toHaveBeenCalledWith("rgba(127, 127, 127, 1.0)");
  });

  it("performs addition, multiplication, subtraction, and division", function() {
    expect(theEvaluationOf("2 3 add 4 mul 5 div 2 sub")).toBe(2);
  });

  it("performs integer division", function() {
    expect(theEvaluationOf("7 3 idiv")).toBe(2);
  });

  it("performs modulus", function() {
    expect(theEvaluationOf("7 3 mod")).toBe(1);
  });

  it("performs absolute value", function() {
    expect(theEvaluationOf("7 abs")).toBe(7);
    expect(theEvaluationOf("-7 abs")).toBe(7);
  });

  it("performs negation", function() {
    expect(theEvaluationOf("7 neg")).toBe(-7);
    expect(theEvaluationOf("-7 neg")).toBe(7);
  });

  it("performs decimal truncation", function() {
    expect(theEvaluationOf("6.2 truncate")).toBe(6);
    expect(theEvaluationOf("6.9 truncate")).toBe(6);
  });

  it("performs half-up rounding", function() {
    expect(theEvaluationOf("6.2 round")).toBe(6);
    expect(theEvaluationOf("6.5 round")).toBe(7);
    expect(theEvaluationOf("7.5 round")).toBe(8);
    expect(theEvaluationOf("6.9 round")).toBe(7);
  });

  it("manipulates items on the stack", function() {
    expect(theEvaluationOf("1 2 (a) count")).toBe(3);
    expect(theEvaluationOf("1 2 (a) clear count")).toBe(0);
    expect(theEvaluationOf("1 2 (a) pop add")).toBe(3);
    expect(theEvaluationOf("2 dup add")).toBe(4);
    expect(theEvaluationOf("2 4 exch div")).toBe(2);
  });

  it("creates and invokes functions", function() {
    expect(theEvaluationOf("/add2 { 2 add } def 2 add2")).toBe(4);
    expect(theEvaluationOf("2 5 { 2 add } repeat")).toBe(12);
  });
});
