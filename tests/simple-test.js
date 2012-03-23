#!/usr/bin/node

const
counter = require('../lib/counter.js'),
assert = require('assert'),
vows = require('vows');

var suite = vows.describe("database tests");
suite.options.error = false;

suite.addBatch({
  "read the counter": {
    topic: function() {
        counter.read(this.callback);
    },
      "and it returns a number": function(r) {
        assert.isNumber(r);
    }
  },
  "bump the counter": {
    topic: function() {
        var cb = this.callback;
        counter.read(function (v1) {
                         counter.bump(function () {
                                          counter.read(function (v2) {
                                                           cb(v1, v2);
                                                       });
                                      });
                     });
    },
    "and it works": function(r1, r2) {
        assert.equal(r2, r1 + 1);
    }
  }
});

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);
