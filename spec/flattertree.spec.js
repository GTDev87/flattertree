/*jslint node: true, nomen: true */
/*globals describe, beforeEach, afterEach, it, expect */


describe("Manually ticking the Jasmine Mock Clock", function () {
    'use strict';
    var mongoose = require('mongoose');

    beforeEach(function (done) {
        mongoose.connect("mongodb://localhost/generic", function () {
            mongoose.connection.db.dropDatabase(function () {
                mongoose.disconnect(function () {
                    done();
                });
            });
        });
    });

    afterEach(function (done) {
        mongoose.connection.db.dropDatabase(function () {
            mongoose.disconnect(function () {
                done();
            });
        });
    });

    it("should do the operations specified", function (done) {
        var flattertree = require('../src/flattertree');

        flattertree.connect("mongodb://localhost/generic", function (dataTree) {
            dataTree.insertNode(
                "directory",
                null,
                null,
                [],
                {hello: "world", object: {object: "stuff"}, arr: ["hello", "govener"], mormon: [{my: "name"}, {is: "elder"}, {price: "cunningham"}], good_data: [{id: 23, hello: "hello"}, {id: 34, hello: "world"}, {id: 45, hello: "neighbor"}]},
                function () {
                    dataTree.insertNode("more_stuff", ",directory,", null, [], {I: "like", data: "sir"}, function () {
                        console.log("about to find");
                        dataTree.fullNodeData(",directory,", function (data) {
                            console.log("data = %j", data);
                            dataTree.findNode(",directory,", function (node) {
                                console.log("node = %j", node);
                                dataTree.findFullNode(",directory,", function (data) {
                                    console.log("full data = %j", data);
                                    dataTree.deleteNode(",directory,#arr,", function () {
                                        dataTree.updateNode(",directory,", null, [], {i: "feel", great: "now"}, function () {
                                            dataTree.findNode(
                                                ",directory,",
                                                function (node) {
                                                    console.log("node = %j", node);
                                                    console.log("success");
                                                    expect(true).toBe(true);
                                                    done();
                                                },
                                                function () {
                                                    console.log("failed at update");
                                                }
                                            );
                                        });
                                    });
                                });
                            });
                        });
                    });
                },
                function (err) {
                    console.log("failure");
                    throw err;
                }
            );
        });
    });
});