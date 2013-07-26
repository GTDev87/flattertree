var flattertree = require('../lib/flattertree');

flattertree.connect("mongodb://localhost/generic", function(){
	flattertree.insertNode("directory", null, null, [], {hello: "world", object: {object: "stuff"}, arr: ["hello", "govener"], mormon: [{my: "name"},{is: "elder"},{price: "cunningham"}], good_data: [{id: 23, hello: "hello"}, {id: 34, hello: "world"}, {id: 45, hello: "neighbor"}]}, function(){
		flattertree.insertNode("more_stuff", ",directory,", null, [], {I: "like", data: "sir"}, function(){
			console.log("about to find");
			flattertree.fullNodeData(",directory,", function(data){
				console.log("data = %j", data);
				flattertree.findNode(",directory,", function(node){
					console.log("node = %j", node);
					flattertree.findFullNode(",directory,", function(data){
						console.log("full data = %j", data);
						flattertree.deleteNode(",directory,#arr,", function(){
							flattertree.updateNode(",directory,", null, [], {i: "feel", great: "now"}, function(){
								flattertree.findNode(",directory,", function(node){
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