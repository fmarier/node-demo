#!/usr/bin/node

const
assert = require('assert'),
vows = require('vows');

var suite = vows.describe("simple test");
suite.options.error = false;

suite.addBatch({
  "everything": {
    topic: function() { return "yes!"; },
    "works": function(r) {
      assert.isString(r);
      assert.equal(r, "yes!");
    }
  }
});

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);
