/*jslint node: true, nomen: true */
(function () {
    'use strict';

    var mongoose = require('mongoose'),
        _ = require('lodash'),
        async = require('async'),
        Node = mongoose.model("Node");

    exports.operations = function () {
        var insertNode;

        function createNodeMetadata(name, parentNodePath, type, tags) {
            return {
                name: name,
                path: parentNodePath,
                tags: tags,
                type: type
            };
        }

        function hasNode(name, path, callback) {
            Node.findOne({ path: path, name: name }).exec(function (err, parentNodeData) {
                if (err) {return callback(err); }
                if (!parentNodeData) {return callback(null, false); }
                return callback(null, true);
            });
        }

        function getPathParts(nodePath) {
            var nodes = nodePath.slice(1, nodePath.length - 1).split(","),
                pathToNodeUnfinished = nodes.slice(0, nodes.length - 1).join(",");

            return {
                pathToNode: nodes.length > 1 ? "," + pathToNodeUnfinished + "," : null,
                nodeName: nodes[nodes.length - 1]
            };
        }

        function nodeCanBeInserted(name, nodePath, callback) {
            var pathParts;
            if (nodePath === null) {return hasNode(name, nodePath, function (err, has) { callback(err, !has); }); }

            pathParts = getPathParts(nodePath);

            hasNode(pathParts.nodeName, pathParts.pathToNode, function (err, has) {
                if (err) {return callback(err); }
                if (!has) {return callback(null, false); }
                return hasNode(name, nodePath, function (err, has) { callback(err, !has); });
            });
        }

        function isArrayLike(data) {
            var values = _.map(data, function (value) { return value; }),
                keys;
            if (values.length === 0) { return false; }
            if (_.every(values, function (value) { return !_.isObject(value); })) { return true; }
            if (_.some(values, function (value) { return !_.isObject(value); })) { return false; }

            keys = _.keys(values[0]);

            return _.every(values, function (value) {
                return _.every(keys, function (key) {
                    return _.has(value, key);
                });
            });
        }

        function childPaths(node) { return (node.path !== null ? node.path : ",") + node.name + ","; }

        function addDataObjects(nodeObject, objects, callback) {
            async.each(
                _.pairs(objects),
                function (pairs, iterCallback) {
                    var objectKey = pairs[0],
                        objectValue = pairs[1],
                        dataName = objectKey;
                    insertNode(
                        dataName,
                        childPaths(nodeObject),
                        "data",
                        [],
                        objectValue,
                        iterCallback
                    );
                },
                callback
            );
        }

        function createNode(nodeMetaData, data, callback) {
            var dataKeyValuePairs = _.pairs(data),
                primitives = _.object(_.filter(dataKeyValuePairs, function (pair) { return !_.isObject(pair[1]); })),
                objects = _.object(_.filter(dataKeyValuePairs, function (pair) { return _.isObject(pair[1]); })),
                properties = data !== undefined ? _.keys(data) : [];

            nodeMetaData.data = primitives;
            if (isArrayLike(data)) { nodeMetaData.type = nodeMetaData.type ? nodeMetaData.type + " array" : "array"; }

            nodeMetaData.template = properties;

            Node.create(nodeMetaData, function (err, nodeObject) {
                if (err || !nodeObject) {return callback(err); }
                return addDataObjects(nodeObject, objects, callback);
            });
        }

        function findNodeObject(currentNode, type, callback) {

            var query = {};
            query.path = childPaths(currentNode);
            if (type !== null) { query.type = new RegExp("^" + type); }

            Node.find(query, function (err, childNodes) {
                if (err) {return callback(err); }
                async.map(
                    childNodes,
                    function (childNode, iterCallback) {
                        findNodeObject(
                            childNode,
                            type,
                            function (err, childData) {
                                var childDataObject = [];

                                if (err) {return callback(err); }
                                childDataObject.push(childNode.name);
                                childDataObject.push(childData);
                                return iterCallback(null, childDataObject);
                            },
                            iterCallback
                        );
                    },
                    function (err, objectArray) {
                        if (err) {return callback(err); }
                        return callback(null, _.object(objectArray.concat(_.pairs(currentNode.data))));
                    }
                );
            });
        }

        //////////////////////////////////visible functions//////////////////////////////////


        insertNode = function (name, parentNodePath, type, tags, data, callback) {
            var nodeMetaData = createNodeMetadata(name, parentNodePath, type, tags);

            nodeCanBeInserted(name, parentNodePath, function (err, canBeCreated) {
                if (canBeCreated) {return createNode(nodeMetaData, data, callback); }
                return callback(err);
            });
        };

        function deleteNode(path, callback) {
            var pathParts = getPathParts(path);

            hasNode(pathParts.nodeName, pathParts.pathToNode, function (err, hasNode) {
                if (err) {return callback(err); }
                if (hasNode) {
                    return Node.remove({path: new RegExp("^" + path) }, function (err) {
                        if (err) {return callback(err); }
                        Node.findOneAndRemove({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err) {
                            if (err) {return callback(err); }
                            return callback(null);
                        });
                    });
                }
                return callback(null);

            });
        }

        function findNode(path, callback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {return callback(err); }
                return callback(null, node);
            });
        }

        function fullNodeData(path, callback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {return callback(err); }
                return findNodeObject(
                    node,
                    "data",
                    callback
                );
            });
        }

        function updateNode(path, type, tags, data, callback) {
            var pathParts = getPathParts(path);

            deleteNode(
                path,
                function (err) {
                    if (err) {return callback(err); }
                    return insertNode(
                        pathParts.nodeName,
                        pathParts.pathToNode,
                        type,
                        tags,
                        data,
                        callback
                    );
                }
            );
        }

        function findFullNode(path, callback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {return callback(err); }
                return findNodeObject(
                    node,
                    null,
                    callback
                );
            });
        }

        return {
            insertNode : insertNode,
            deleteNode : deleteNode,
            findNode : findNode,
            fullNodeData : fullNodeData,
            updateNode : updateNode,
            findFullNode: findFullNode
        };
    };
}());
