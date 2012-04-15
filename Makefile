all:

lint:
	node_modules/jshint/bin/hint *.js lib/ tests/ --config jshint-config.json
