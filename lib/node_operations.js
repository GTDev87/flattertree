var  _ = require('underscore')
	, mongoose = require('mongoose')
	, async = require('async')
	, Node = mongoose.model("Node");

function createNodeMetadata(name, parentNodePath, tags, unique){
	return {
		name: name,
		path: parentNodePath,
		tags: tags,
		unique: unique
	};
}

function isArrayLike(data){
	var values = _.map(data, function(value){ return value; });
	if(values.length === 0){ return false; }
	if(_.every(values, function(value){ return !_.isObject(value);})){ return true; }
	if(_.some(values, function(value){ return !_.isObject(value);})){ return false; }

	var keys = _.keys(values[0]);

	return _.every(values, function(value){
		return _.every(keys, function(key){
			return _.has(value, key)
		});
	});
}

function addDataObjects(nodeObject, objects, callback, failCallback){
	async.each(_.pairs(objects), 
		function(pairs, iterCallback){
			var objectKey = pairs[0];
			var objectValue = pairs[1];
			var dataName = "#" + objectKey;
			insertNode(dataName, childPaths(nodeObject), [], [], objectValue, function(){ iterCallback(); }, 
			function(){ iterCallback(new Error("iteration error")); });
		}, 
		function(err){
			if(err) { failCallback(err); }
			else{ callback(); }
		}
	);
}

function createNode(nodeMetaData, data, callback, failCallback){
	var dataKeyValuePairs = _.pairs(data);
	var primitives = _.object(_.filter(dataKeyValuePairs, function(pair){ return !_.isObject(pair[1]); }));
	var objects = _.object(_.filter(dataKeyValuePairs, function(pair){ return _.isObject(pair[1]); }));

	var properties = data !== undefined ? _.keys(data) : [];

	nodeMetaData["data"] = primitives;
	nodeMetaData["type"] = isArrayLike(data) ? "data_array" : null;
	nodeMetaData["template"] = properties;

	Node.create(nodeMetaData, function(err, nodeObject){
		if(err || !nodeObject){ failCallback(err); }
		else { addDataObjects(nodeObject, objects, callback, failCallback); }
	});
}

function hasNode(name, path, callback){
	Node.findOne({ path: path, name: name }).exec(function(err, parentNodeData){
		if(err || !parentNodeData){ callback(false); }
		else{ callback(true); }
	});
}

function getPathParts(nodePath){
	var nodes = nodePath.slice(1, nodePath.length - 1).split(",");
	var pathToNodeUnfinished = nodes.slice(0, nodes.length - 1).join(",");

	return {
		pathToNode: nodes.length > 1 ? "," + pathToNodeUnfinished + "," : null,
		nodeName: nodes[nodes.length - 1]
	};
}

function nodeCanBeInserted(name, nodePath, callback){
	if(nodePath === null){ hasNode(name, nodePath, function(has){ callback(!has); }); }
	else{
		var pathParts = getPathParts(nodePath);

		hasNode(pathParts.nodeName, pathParts.pathToNode, function(has){
			if(!has){ callback(false) }
			else{ hasNode(name, nodePath, function(has){ callback(!has); }); }
		});
	}
}

function childPaths(node){ return (node.path !== null ? node.path : ",") + node.name + ","; }

var findNodeDataObject = function(currentNode, callback, failCallback){
	Node.find({path: childPaths(currentNode), name: /^#/}, function(err, childNodes){
		if(err){failCallback(err); }
		else{
			async.map(
				childNodes, 
				function(childNode, iterCallback){
					findNodeDataObject(
						childNode, 
						function(childData){
							var childDataObject = [];
							childDataObject.push(childNode.name.slice(1,childNode.name.length));
							childDataObject.push(childData);
							iterCallback(null, childDataObject);
						}, 
						function(){ iterCallback(new Error("iteration error"), null); }
					);
				}, 
				function(err, objectArray){
					if(err) { failCallback(err); }
					else{ callback(_.object(objectArray.concat(_.pairs(currentNode.data)))); }
				}
			); 
		}
	});
}

//////////////////////////////////visible functions//////////////////////////////////
var insertNode = function(name, parentNodePath, tags, unique, data, callback, failCallback){
	var nodeMetaData = createNodeMetadata(name, parentNodePath, tags, unique);

	nodeCanBeInserted(name, parentNodePath, function(canBeCreated){
		if(canBeCreated){ createNode(nodeMetaData, data, callback, failCallback); }
		else{ failCallback(); }	
	});
}
exports.insertNode = insertNode;

var deleteNode = function(path, callback, failCallback){

	var pathParts = getPathParts(path);

	hasNode(pathParts.nodeName, pathParts.pathToNode, function(){
		Node.remove({path: new RegExp("^" + path) }, function(err){
			if(err){ failCallback(err); }
			else{
				Node.findOneAndRemove({name: pathParts.nodeName, path: pathParts.pathToNode}, function(err, node){
					if(err){ failCallback(err); }
					else { callback(); }
				});
			}
		});
	});
}
exports.deleteNode = deleteNode;

var findNode = function(path, callback, failCallback){
	var pathParts = getPathParts(path);

	Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function(err, node){
		if(err){failCallback(err); }
		else{ callback(node); }
	});
}
exports.findNode = findNode;

var fullNodeData = function(path, callback, failCallback){
	var pathParts = getPathParts(path);

	Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function(err, node){
		if(err){failCallback(err); }
		else{
			findNodeDataObject(node, 
				function(data){ callback(data); },
				function(err){ failCallback(err); }
			);
		}
	});
}
exports.fullNodeData = fullNodeData;

var updateNode = function(path, tags, unique, data, callback, failCallback){
	var pathParts = getPathParts(path);

	deleteNode(path, 
		function(){
			insertNode(pathParts.nodeName, pathParts.pathToNode, tags, unique, data, 
				function(){ callback(); }, 
				function(err){ failCallback(err); }
			);
		},
		function(err){ failCallback(err); }
	)
}
exports.updateNode = updateNode;