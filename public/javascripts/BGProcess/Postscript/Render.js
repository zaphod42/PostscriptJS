if (!window.BGProcess) { BGProcess = {}; }
if (!BGProcess.Postscript) { BGProcess.Postscript = {}; }

BGProcess.Postscript.Dictionary = function(elder) {
    var dict = {};
    return {
        define: function(literal, value) { dict[literal] = value; },
        lookup: function(literal) {
            if (dict.hasOwnProperty(literal)) { return dict[literal]; }
            if (elder) { return elder.lookup(literal); }
            return undefined;
        }
    };
};

BGProcess.Tracer = function(obj) {
    var trace = [], 
        self = { getTrace: function() { return trace; } },
        m;

    for (var m in obj) {
        if (obj.hasOwnProperty(m)) {
            self[m] = (function(method) { 
                return function() {
                    trace.push(method + "(" + Array.prototype.join.call(arguments, ", ") + ")");
                    return obj[method].apply(obj, arguments);
                }; })(m);
        }
    }

    return self;
};

BGProcess.Postscript.CanvasSheet = function() {
    var canvas = document.createElement('canvas'), context,
        inPath = false;

    canvas.width = "612";
    canvas.height = "792";
    canvas.style.border = "1px solid grey";
    canvas.style.margin = "2px";

    context = canvas.getContext("2d");

    return {
        autoPath: function() { if(!inPath) { this.beginPath(); } },
        getCanvas: function() { return canvas; },

        beginPath: function() { context.beginPath(); inPath = true; },
        closePath: function() { context.closePath(); inPath = false; },
        fill: function() { context.fill(); inPath = false; },
        fillText: function(text, x, y) { context.fillText(text, x, 792 - y); },
        moveTo: function(x, y) { context.moveTo(x, 792 - y); },
        lineTo: function(x, y) { this.autoPath(); context.lineTo(x, 792 - y); },
        arc: function(x, y, radius, startRads, endRads, dir) { this.autoPath(); context.arc(x, 792 - y, radius, startRads, endRads, dir); },
        arcTo: function(x1, y1, x2, y2, radius) { this.autoPath(); context.arcTo(x1, 792 - y1, x2, 792 - y2, radius); },
        stroke: function() { context.stroke(); inPath = false; },
        
        measureText: function(text) { 
            var metrics = context.measureText(text); 
            return { width: metrics.width, height: undefined }; /*TODO: need to calc the height metric*/ },

        setStrokeStyle: function(style) { context.strokeStyle = style; },
        setFillStyle: function(style) { context.fillStyle = style; },
        setLineWidth: function(width) { context.lineWidth = width; },
        setFont: function(font) { context.font = font; },

        translate: function(dx, dy) { context.translate(dx, -dy); },
        rotate: function(rotateRads) { 
            context.translate(0, 792);
            context.rotate(rotateRads); 
            context.translate(0, -792); },
        scale: function(x, y) {
            context.translate(0, 792);
            context.scale(x, y);
            context.translate(0, -792); },

        save: function() { context.save(); },
        restore: function() { context.restore(); }
    };
};

BGProcess.Postscript.Render = function(parser, nextPage) {
    var dictionary = BGProcess.Postscript.Dictionary,
        system_dictionary = dictionary(),
        grammar = {},
        fonts = {
            'Times-Roman': ['times', 'normal'],
            'Times-Bold': ['times', 'bold'],
            'Times-Italic': ['times', 'italic'],
            'Times-BoldItalic': ['times', 'italic bold'],
            'Helvetica': ['helvetica', 'normal'],
            'Helvetica-Bold': ['helvetica', 'bold'],
            'Helvetica-Oblique': ['helvetica', 'oblique'],
            'Helvetica-BoldOblique': ['helvetica', 'oblique bold'],
            'Courier': ['courier', 'normal'],
            'Courier-Bold': ['courier', 'bold'],
            'Courier-Oblique': ['courier', 'oblique'],
            'Courier-BoldOblique': ['courier', 'oblique bold'],
            'Symbol': ['Symbol', 'normal']
        },
        prelude = "/selectfont { exch findfont exch scalefont setfont } def";

    function degreesToRadians(deg) { return 2 * Math.PI - deg * Math.PI / 180; }
    function func(f) {
        var parameters = /function[^(]*\(([^)]*)\)/.exec(f.toString())[1],
            numParams = parameters === "" ? 0 : parameters.split(",").length;
        return function(env) {
            var params = [], i, value;
            for (i = 0; i < numParams; i += 1) {
                params.unshift(env.stack.pop());
            }
            value = f.apply(env, params);
            if (value !== undefined) {
              env.stack.push(value); 
            }
        };
    }
    function binop(f) {
        return function(env) {
            var b = env.stack.pop(), a = env.stack.pop();
            env.stack.push(f(a, b));
        };
    }
    function uniop(f) {
        return function(env) { env.stack.push(f(env.stack.pop())); };
    }

    /*
     * Builtin Commands
     */
    system_dictionary.define("mul", func(function(a, b) { return a * b; }));
    system_dictionary.define("div", func(function(a, b) { return a / b; }));
    system_dictionary.define("idiv", func(function(a, b) { return 0|(a / b); }));
    system_dictionary.define("mod", func(function(a, b) { return a % b; }));
    system_dictionary.define("sub", func(function(a, b) { return a - b; }));
    system_dictionary.define("add", func(function(a, b) { return a + b; }));
    system_dictionary.define("abs", uniop(Math.abs));
    system_dictionary.define("neg", func(function(a) { return -a; }));
    system_dictionary.define("ceiling", uniop(Math.ceil));
    system_dictionary.define("floor", uniop(Math.floor));
    system_dictionary.define("round", uniop(Math.round));
    system_dictionary.define("truncate", func(function(a) { return 0|a; }));
    system_dictionary.define("sqrt", uniop(Math.sqrt));
    system_dictionary.define("atan", binop(Math.atan2));
    system_dictionary.define("cos", uniop(Math.cos));
    system_dictionary.define("sin", uniop(Math.sin));
    system_dictionary.define("exp", binop(Math.pow));
    system_dictionary.define("ln", binop(Math.log));

    system_dictionary.define("eq", func(function(a, b) { return a === b; }));
    system_dictionary.define("ne", func(function(a, b) { return a !== b; }));

    system_dictionary.define("clear", func(function() { this.stack = []; }));
    system_dictionary.define("count", func(function() { this.stack.push(this.stack.length); }));
    system_dictionary.define("pop", func(function(a) {}));
    system_dictionary.define("dup", func(function(a) { this.stack.push(a); this.stack.push(a); }));
    system_dictionary.define("copy", func(function(n) { 
        var i, offset = this.stack.length - n;
        for (i = 0; i < n; i += 1) { this.stack.push(this.stack[offset + i]); } }));
    system_dictionary.define("index", func(function(index) { return this.stack[this.stack.length - index]; }));
    system_dictionary.define("exch", func(function(a, b) { this.stack.push(b); this.stack.push(a); }));

    system_dictionary.define("def", func(function(lit, value) { this.dictionary.define(lit, value); }));

    system_dictionary.define("repeat", func(function(count, block) {
        for (; count > 0; count -= 1) {
            block(this);
        } }));

    system_dictionary.define("closepath", func(function() { this.page.closePath(); }));
    system_dictionary.define("fill", func(function() { this.page.fill(); }));
    system_dictionary.define("newpath", func(function() { this.page.beginPath(); }));
    system_dictionary.define("moveto", func(function(x, y) { 
        this.x = x;
        this.y = y;
        this.page.moveTo(this.x, this.y); }));
    system_dictionary.define("rmoveto", func(function(dx, dy) { 
        this.x += dx;
        this.y += dy;
        this.page.moveTo(this.x, this.y); }));
    system_dictionary.define("lineto", func(function(x, y) { 
        this.x = x;
        this.y = y;
        this.page.lineTo(this.x, this.y); }));
    system_dictionary.define("rlineto", func(function(dx, dy) { 
        this.x += dx;
        this.y += dy;
        this.page.lineTo(this.x, this.y); }));
    system_dictionary.define("arc", func(function(x, y, radius, start, end) { 
        this.page.arc(x, y, radius, 
                     degreesToRadians(start), 
                     degreesToRadians(end), true); }));
    system_dictionary.define("arcto", func(function(x1, y1, x2, y2, radius) { 
        this.page.arcTo(x1, y1, x2, y2, radius); }));
    system_dictionary.define("arcn", func(function(x, y, radius, start, end) { 
        this.page.arc(x, y, radius, 
                     degreesToRadians(start), 
                     degreesToRadians(end), false); }));

    system_dictionary.define("setgray", func(function(level) {
        var v = Math.floor(255 * level),
            rgb = "rgba("+v+", "+v+", "+v+", 1.0)"; 
        this.page.setStrokeStyle(rgb);
        this.page.setFillStyle(rgb); }));
    system_dictionary.define("setlinewidth", func(function(width) { this.page.setLineWidth(width); }));
    system_dictionary.define("stroke", func(function() { this.page.stroke(); }));
    system_dictionary.define("showpage", func(function() { 
        this.printer(this.page);
        this.page = nextPage(); }));
    system_dictionary.define("translate", func(function(dx, dy) { this.page.translate(dx, dy); }));
    system_dictionary.define("rotate", func(function(degrees) { this.page.rotate(degreesToRadians(degrees)); }));
    system_dictionary.define("scale", func(function(x, y) { this.page.scale(x, y); }));
    system_dictionary.define("currentpoint", func(function() { 
        this.stack.push(this.x); 
        this.stack.push(this.y); }));
    system_dictionary.define("gsave", func(function() { this.page.save(); }));
    system_dictionary.define("grestore", func(function() { this.page.restore(); }));

    system_dictionary.define("findfont", func(function(fontname) { return { face: fonts[fontname], pt: 1 }; }));
    system_dictionary.define("scalefont", func(function(font, factor) {
        font.pt = factor * font.pt;
        return font; }));
    system_dictionary.define("setfont", func(function(font) {
        this.font = font;
        this.page.setFont(this.font.face[1] + " " + 
                          this.font.pt + "px " + 
                          this.font.face[0]); }));
    system_dictionary.define("show", func(function(text) { this.page.fillText(text, this.x, this.y); }));
    system_dictionary.define("stringwidth", func(function(text) {
        var metrics = this.page.measureText(text);
        this.stack.push(metrics.width);
        this.stack.push(metrics.height); }));

    function sequence(commands) {
        return function(env) {
            var cp = 0;
            for (; cp < commands.length; cp += 1) {
                commands[cp](env);
            }
        };
    }

    return {
        render: function(doc, printer) {
            var program = [], stack = [];

            function action(f) {
                return function(m) {
                    program.push(function(env) { f(m, env); });
                };
            }

            parser.listen('deref', action(function(m, env) {
                var value = env.dictionary.lookup(m);
                if (value === undefined) { throw "<" + m + "> is undefined"; }
                if (typeof value === "function") { value(env); } 
                else { env.stack.push(value); } }));
            parser.listen('literal', action(function(m, env) { env.stack.push(m.substr(1)); }));
            parser.listen('num', action(function(m, env) { env.stack.push(parseFloat(m)); }));
            parser.listen('str', action(function(m, env) { env.stack.push(m.substr(1, m.length - 2)); }));
            parser.listen('startBlock', function() { stack.push(program); program = []; });
            parser.listen('endBlock', function() { 
                var procedure = program;
                program = stack.pop();
                program.push(function(env) { env.stack.push(sequence(procedure)); }); });

            parser.parse(prelude + " " + doc);

            sequence(program)({
                stack: [],
                dictionary: dictionary(system_dictionary),
                x: 0,
                y: 0,
                font: undefined,
                printer: printer,
                page: nextPage()
            });
        }
    };
};
