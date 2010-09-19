(function() {
  var jasmineReporter,
      jasmineEnv = jasmine.getEnv();

  jasmineReporter = (function() {
    var server = new WebSocket("ws://localhost:3000/results");

    return {
      isReady: function() {
        return server.readyState == server.OPEN;
      },

      reportRunnerStarting: function(runner) { 
        server.send(JSON.stringify({ plan: runner.specs().length })); 
      },

      reportRunnerResults: function(runner) { 
        server.send(JSON.stringify({ finished: runner.specs().length })); 
      },

      reportSuiteResults: function() { },
      reportSpecStarting: function() { },

      reportSpecResults: function(spec) { 
        var messages = [], i = 0, items = spec.results().getItems();
        for (; i < items.length; i += 1) {
          messages.push(items[i].toString());
        }
        server.send(JSON.stringify({ suite: spec.suite.description, 
                                     spec: spec.description, 
                                     failedCount: spec.results().failedCount,
                                     description: messages }));
      },

      log: function(msg) { 
        server.send(JSON.stringify({ text: msg })); 
      }
    };
  })();

  jasmineEnv.addReporter(jasmineReporter);

  window.onload = function() {
    function executeTestsWhenReady() {
      if (jasmineReporter.isReady()) {
        jasmineEnv.execute();
      } else {
        setTimeout(executeTestsWhenReady, 0);
      }
    };

    setTimeout(executeTestsWhenReady, 0);
  };
})();
