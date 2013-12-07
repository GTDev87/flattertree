/*jslint node: true, nomen: true*/


(function () {
    'use strict';
    var _ = require('lodash'),
        async = require('async');



    function tree(schema) {
        schema.add({
            name: String,
            path: String,
            type: String,
            tags: [],
            created_at: {type: Date, default: Date.now},
            data: { /*magic needs to happen in here*/ },
            template: {/* will hold all the properties at current level (if array or array-like approximation), if array-like common elements one level deeper */}
        });


        schema.static("node", function () {
            var self = this,
                insert;

            function createNodeMetadata(name, parentNodePath, options) {
                return {
                    name: name,
                    path: parentNodePath,
                    tags: options.tags,
                    type: options.type
                };
            }

            function hasNode(name, path, callback) {
                self.findOne({ path: path, name: name }).exec(function (err, parentNodeData) {
                    if (err) {return callback(err); }
                    return callback(null, !!parentNodeData);
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

                        insert(
                            dataName,
                            childPaths(nodeObject),
                            objectValue,
                            {
                                type: "data",
                                tags: []
                            },
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

                self.create(nodeMetaData, function (err, nodeObject) {
                    if (err || !nodeObject) {return callback(err); }
                    return addDataObjects(nodeObject, objects, callback);
                });
            }

            function findNodeObject(currentNode, type, callback) {

                var query = {};
                query.path = childPaths(currentNode);
                if (type !== null) { query.type = new RegExp("^" + type); }

                self.find(query, function (err, childNodes) {
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

            insert = function (name, parentNodePath, data, options, callback) {
                var nodeMetaData = createNodeMetadata(name, parentNodePath, options);

                nodeCanBeInserted(name, parentNodePath, function (err, canBeCreated) {
                    if (canBeCreated) {return createNode(nodeMetaData, data, callback); }
                    return callback(err);
                });
            };

            function deleteN(path, callback) {
                var pathParts = getPathParts(path);

                hasNode(pathParts.nodeName, pathParts.pathToNode, function (err, hasNode) {
                    if (err) {return callback(err); }
                    if (hasNode) {
                        return self.remove({path: new RegExp("^" + path) }, function (err) {
                            if (err) {return callback(err); }
                            self.findOneAndRemove({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err) {
                                if (err) {return callback(err); }
                                return callback(null);
                            });
                        });
                    }
                    return callback(null);

                });
            }

            //////////////////////////////////visible functions//////////////////////////////////


            function insertNode(name, parentNodePath, data, options, callback) {
                insert(name, parentNodePath, data, options, callback);
            }

            function deleteNode(path, callback) {
                deleteN(path, callback);
            }

            function findNode(path, callback) {
                var pathParts = getPathParts(path);

                self.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, callback);
            }

            function fullNodeData(path, callback) {
                var pathParts = getPathParts(path);

                self.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                    if (err) {return callback(err); }
                    return findNodeObject(node, "data", callback);
                });
            }

            function updateNode(path, data, options, callback) {
                var pathParts = getPathParts(path);

                deleteN(
                    path,
                    function (err) {
                        if (err) {return callback(err); }
                        return insert(
                            pathParts.nodeName,
                            pathParts.pathToNode,
                            data,
                            options,
                            callback
                        );
                    }
                );
            }

            function findFullNode(path, callback) {
                var pathParts = getPathParts(path);

                self.findOne({name: pathParts.nodeName, path: pathParts.pathToNode}, function (err, node) {
                    if (err) {return callback(err); }
                    return findNodeObject(node, null, callback);
                });
            }

            return {
                insert: insertNode,
                delete: deleteNode,
                find: findNode,
                fullData: fullNodeData,
                update: updateNode,
                findFull: findFullNode
            };
        });
    }

    module.exports = tree;
}());