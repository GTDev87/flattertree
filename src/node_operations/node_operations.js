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
                if (err) {
                    callback(err);
                } else if (!parentNodeData) {
                    callback(null, false);
                } else {
                    callback(null, true);
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
                hasNode(name, nodePath, function (err, has) { callback(err, !has); });
            } else {
                var pathParts = getPathParts(nodePath);

                hasNode(pathParts.nodeName, pathParts.pathToNode, function (err, has) {
                    if (err) {
                        callback(err);
                    } else if (!has) {
                        callback(null, false);
                    } else {
                        hasNode(name, nodePath, function (err, has) { callback(err, !has); });
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
                function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                }
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
                if (err || !nodeObject) {
                    callback(err);
                } else {
                    addDataObjects(nodeObject, objects, callback);
                }
            });
        }

        function findNodeObject(currentNode, type, callback) {

            var query = {};
            query.path = childPaths(currentNode);
            if (type !== null) { query.type = new RegExp("^" + type); }

            Node.find(query, function (err, childNodes) {
                if (err) {
                    callback(err);
                } else {
                    async.map(
                        childNodes,
                        function (childNode, iterCallback) {
                            findNodeObject(
                                childNode,
                                type,
                                function (err, childData) {
                                    var childDataObject = [];

                                    if (err) {
                                        callback(err);
                                    } else {
                                        childDataObject.push(childNode.name);
                                        childDataObject.push(childData);
                                        iterCallback(null, childDataObject);
                                    }
                                },
                                function (err) { iterCallback(err); }
                            );
                        },
                        function (err, objectArray) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, _.object(objectArray.concat(_.pairs(currentNode.data))));
                            }
                        }
                    );
                }
            });
        }

        //////////////////////////////////visible functions//////////////////////////////////


        insertNode = function (name, parentNodePath, type, tags, data, callback) {
            var nodeMetaData = createNodeMetadata(name, parentNodePath, type, tags);

            nodeCanBeInserted(name, parentNodePath, function (err, canBeCreated) {
                if (canBeCreated) {
                    createNode(nodeMetaData, data, callback);
                } else {
                    callback(err);
                }
            });
        };

        deleteNode = function (path, callback) {
            var pathParts = getPathParts(path);

            hasNode(pathParts.nodeName, pathParts.pathToNode, function (err, hasNode) {
                if (err) {
                    callback(err);
                } else {
                    if (hasNode) {
                        Node.remove({path: new RegExp("^" + path) }, function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                Node.findOneAndRemove({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback(null);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(null);
                    }
                }
            });
        };

        findNode = function (path, callback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, node);
                }
            });
        };

        fullNodeData = function (path, callback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {
                    callback(err);
                } else {
                    findNodeObject(
                        node,
                        "data",
                        callback
                    );
                }
            });
        };

        updateNode = function (path, type, tags, data, callback) {
            var pathParts = getPathParts(path);

            deleteNode(
                path,
                function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        insertNode(
                            pathParts.nodeName,
                            pathParts.pathToNode,
                            type,
                            tags,
                            data,
                            function (err) { callback(err); }
                        );
                    }
                }
            );
        };

        findFullNode = function (path, callback) {
            var pathParts = getPathParts(path);

            Node.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                if (err) {
                    callback(err);
                } else {
                    findNodeObject(
                        node,
                        null,
                        callback
                    );
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
