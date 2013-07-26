var flatree = require('../lib/flattertree');

flatree.connect("mongodb://localhost/generic", function(){
	flatree.insertNode("directory", null, null, [], {hello: "world", object: {object: "stuff"}, arr: ["hello", "govener"], mormon: [{my: "name"},{is: "elder"},{price: "cunningham"}], good_data: [{id: 23, hello: "hello"}, {id: 34, hello: "world"}, {id: 45, hello: "neighbor"}]}, function(){
		flatree.insertNode("more_stuff", ",directory,", null, [], {I: "like", data: "sir"}, function(){
			console.log("about to find");
			flatree.fullNodeData(",directory,", function(data){
				console.log("data = %j", data);
				flatree.findNode(",directory,", function(node){
					console.log("node = %j", node);
					flatree.findFullNode(",directory,", function(data){
						console.log("full data = %j", data);
						flatree.deleteNode(",directory,#arr,", function(){
							flatree.updateNode(",directory,", null, [], {i: "feel", great: "now"}, function(){
								flatree.findNode(",directory,", function(node){
									console.log("node = %j", node);
									console.log("success");
								}, 
								function(){
									console.log("failed at update");
								});
							});
						});
					});
				});
			});
		});
	}, 
	function(err){
		console.log("failure");
		throw err;
	});
});