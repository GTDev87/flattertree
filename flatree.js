var mongoose = require('mongoose')
	, request = require('request')
	, fs = require('fs');



mongoose.connect("mongodb://localhost/generic", function(){
	var models_path = __dirname + '/models'; // __dirname = ./config
	fs.readdirSync(models_path).forEach(function (file) {
		require(models_path + '/' + file);
	});

	var node_operations = require("./lib/node_operations");

	node_operations.insertNode("directory", null, [], [], {hello: "world", object: {object: "stuff"}, arr: ["hello", "govener"], mormon: [{my: "name"},{is: "elder"},{price: "cunningham"}], good_data: [{id: 23, hello: "hello"}, {id: 34, hello: "world"}, {id: 45, hello: "neighbor"}]}, 
		function(){
			console.log("about to find");
			node_operations.fullNodeData(",directory,", function(data){
				console.log("data = %j", data);
				node_operations.deleteNode(",directory,#arr,", function(){
					node_operations.updateNode(",directory,", [], [], {i: "feel", great: "now"}, function(){
						node_operations.findNode(",directory,", 
							function(node){
								console.log("node = %j", node);
								console.log("success");
							}, 
							function(){
								console.log("failed at update");
							}
						);
					});
				});
			});
		}, 
		function(err){
			console.log("failure");
			throw err;
		}
	);

});
