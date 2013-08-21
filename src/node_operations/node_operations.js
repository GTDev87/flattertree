/*jslint node: true, nomen: true */
(function () {
    'use strict';

    var mongoose = require('mongoose'),
        _ = require('lodash'),
        async = require('async'),
        Node = mongoose.model("Node");

    exports.operations = function () {

        var insertNode,
            deleteNode,
            findNode,
            fullNodeData,
            updateNode,
            findFullNode;

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
                if (err || !parentNodeData) {
                    callback(false);
                } else {
                    callback(true);
                }
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
            if (nodePath === null) {
                hasNode(name, nodePath, function (has) { callback(!has); });
            } else {
                var pathParts = getPathParts(nodePath);

                hasNode(pathParts.nodeName, pathParts.pathToNode, function (has) {
                    if (!has) {
                        callback(false);
                    } else {
                        hasNode(name, nodePath, function (has) { callback(!has); });
                    }
                });
            }
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

        function addDataObjects(nodeObject, objects, callback, failCallback) {
            async.each(_.pairs(objects),
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
                        function () { iterCallback(); },
                        function () { iterCallback(new Error("iteration error")); }
                    );
                },
                function (err) {
                    if (err) {
                        failCallback(err);
                    } else {
                        callback();
                    }
                });
        }

        function createNode(nodeMetaData, data, callback, failCallback) {
            var dataKeyValuePairs = _.pairs(data),
                primitives = _.object(_.filter(dataKeyValuePairs, function (pair) { return !_.isObject(pair[1]); })),
                objects = _.object(_.filter(dataKeyValuePairs, function (pair) { return _.isObject(pair[1]); })),
                properties = data !== undefined ? _.keys(data) : [];

            nodeMetaData.data = primitives;
            if (isArrayLike(data)) { nodeMetaData.type = nodeMetaData.type ? nodeMetaData.type + " array" : "array"; }

            nodeMetaData.template = properties;

            Node.create(nodeMetaData, function (err, nodeObject) {
                if (err || !nodeObject) {
                    failCallback(err);
                } else {
                    addDataObjects(nodeObject, objects, callback, failCallback);
                }
            });
        }

        function findNodeObject(currentNode, type, callback, failCallback) {

            var query = {};
            query.path = childPaths(currentNode);
            if (type !== null) { query.type = new RegExp("^" + type); }

            Node.find(query, function (err, childNodes) {
                if (err) {
                    failCallback(err);
                } else {
                    async.map(
                        childNodes,
                        function (childNode, iterCallback) {
                            findNodeObject(
                                childNode,
                                type,
                                function (childData) {
                                    var childDataObject = [];
                                    childDataObject.push(childNode.name);
                                    childDataObject.push(childData);
                                    iterCallback(null, childDataObject);
                                },
                                function () { iterCallback(new Error("iteration error"), null); }
                            );
                        },
                        function (err, objectArray) {
                            if (err) {
                                failCallback(err);
                            } else {
                                callback(_.object(objectArray.concat(_.pairs(currentNode.data))));
                            }
                        }
                    );
                }
            });
        }

        //////////////////////////////////visible functions//////////////////////////////////


        insertNode = function (name, parentNodePath, type, tags, data, callback, failCallback) {
            var nodeMetaData = createNodeMetadata(name, parentNodePath, type, tags);

            nodeCanBeInserted(name, parentNodePath, function (canBeCreated) {
                if (canBeCreated) {
                    createNode(nodeMetaData, data, callback, failCallback);
                } else {
                    failCallback();
                }
            });
        };

        deleteNode = function (path, callback, failCallback) {
            var pathParts = getPathParts(path);

            hasNode(pathParts.nodeName, pathParts.pathToNode, function () {
                Node.remove({path: new RegExp("^" + path) }, function (err) {
                    if (err) {
                        failCallback(err);
                    } else {
                        Node.findOneAndRemove({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err) {
                            if (err) {
                                failCallback(err);
                            } else {
                                callback();
                            }
                        });
                    }
                });
            });
        };

        findNode = function (path, callback, failCallback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {
                    failCallback(err);
                } else {
                    callback(node);
                }
            });
        };

        fullNodeData = function (path, callback, failCallback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {
                    failCallback(err);
                } else {
                    findNodeObject(node, "data",
                        function (data) { callback(data); },
                        function (err) { failCallback(err); });
                }
            });
        };

        updateNode = function (path, type, tags, data, callback, failCallback) {
            var pathParts = getPathParts(path);

            deleteNode(path,
                function () {
                    insertNode(pathParts.nodeName, pathParts.pathToNode, type, tags, data,
                        function () { callback(); },
                        function (err) { failCallback(err); });
                },
                function (err) { failCallback(err); });
        };

        findFullNode = function (path, callback, failCallback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {
                    failCallback(err);
                } else {
                    findNodeObject(node, null,
                        function (data) { callback(data); },
                        function (err) { failCallback(err); });
                }
            });
        };

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
