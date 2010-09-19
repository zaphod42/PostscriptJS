if (!window.BGProcess) { BGProcess = {}; }
if (!BGProcess.Postscript) { BGProcess.Postscript = {}; }

BGProcess.Postscript.Viewer = function(element) {
   function fetch_file(name, callback) {
       var req = new XMLHttpRequest();
       req.onreadystatechange = function() {
           if (req.readyState == 4) {
               if (req.status == 200) {
                   callback(req.responseText);
               } else {
                   alert("Problem loading file<" + req.status + ">: " + req.responseText);
               }
           }
       };
       req.open("GET", "http://localhost:3000/" + name, true);
       req.send(null);
   }

   function show_file(doc, source, position, name) {
       var pages = [];

       while(doc.hasChildNodes()) { doc.removeChild(doc.lastChild); }

       fetch_file(name, 
       function(ps) {
           try {
               BGProcess.Postscript.Render(
                   BGProcess.Postscript.Parser(), 
                   function() { return BGProcess.Tracer(BGProcess.Postscript.CanvasSheet()); })
               .render(ps, function(sheet) {
                   var canvas = sheet.getCanvas();
                   canvas.trace = sheet.getTrace();
                   doc.appendChild(canvas);
                   canvas.style.display = "none";
                   pages.push(canvas);
               });
               source.innerHTML = BGProcess.Postscript.PrettyPrint().prettyPrint(ps);

               pages[0].style.display = "block";
               position.innerHTML = "1/" + pages.length;
           } catch(e) {
               alert(e);
           }
       });

       return pages;
   }

   element.innerHTML = "<select id='files'></select>"
                     + "<a href='#' id='previous'>&lt;-</a>"
                     + "<span id='position'></span>"
                     + "<a href='#' id='next'>-&gt;</a>"
                     + "&nbsp;<a href='#' id='reload'>Reload</a>"
                     + "<div style='clear:both'></div>"
                     + "<div id='doc' style='float: left'></div>"
                     + "<div id='source' style='float:right'></div>";

   var pages = [], current_page = 0,
       selector = document.getElementById("files"),
       doc = document.getElementById("doc"),
       source = document.getElementById("source"),
       position = document.getElementById("position"),
       nexter = document.getElementById("next"),
       reloader = document.getElementById("reload"),
       previouser = document.getElementById("previous");

   nexter.onclick = function() {
       if (current_page < pages.length - 1) {
           pages[current_page].style.display = "none";
           current_page += 1;
           pages[current_page].style.display = "block";
           alert(pages[current_page].trace);
           position.innerHTML = current_page + 1 + "/" + pages.length;
       }
   };

   previouser.onclick = function() {
       var previous = current_page;
       current_page = current_page > 0 ? current_page - 1 : pages.length - 1;
       pages[previous].style.display = "none";
       pages[current_page].style.display = "block";
       alert(pages[current_page].trace);
       position.innerHTML = current_page + 1 + "/" + pages.length;
   };

   fetch_file("postscripts", function(files_text) {
       var files = eval(files_text),
           i, option;
       files.unshift("");
       for (i = 0; i < files.length; i += 1) {
           option = document.createElement('option');
           option.innerHTML = files[i];
           selector.appendChild(option);
       }
   });

   selector.onchange = function() {
       pages = show_file(doc, source, position, selector.options[selector.selectedIndex].innerHTML);
       current_page = 0;
   };

   reloader.onclick = selector.onchange;
};
