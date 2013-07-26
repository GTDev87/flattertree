var mongoose = require('mongoose')
	, fs = require('fs');


var connect = function(mongoLocation, callback){
	mongoose.connect(mongoLocation, function(){
		var models_path = __dirname + '/models'; // __dirname = ./config
		fs.readdirSync(models_path).forEach(function (file) {
			require(models_path + '/' + file);
		});

		node_operations = require('./node_operations/node_operations');
		exports.insertNode = node_operations.insertNode;
		exports.deleteNode = node_operations.deleteNode;
		exports.findNode = node_operations.findNode;
		exports.fullNodeData = node_operations.fullNodeData;
		exports.updateNode = node_operations.updateNode;
		exports.findFullNode = node_operations.findFullNode;

		if (callback) { callback(); }
	});
}

exports.connect = connect;

