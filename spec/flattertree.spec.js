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

    it("should insert node", function (done) {
        var flattertree = require('../src/flattertree'),
            dataTree = flattertree.connect("mongodb://localhost/generic");

        dataTree.insertNode(
            "directory",
            null,
            {
                hello: "world",
                object: {object: "stuff"},
                arr: ["hello", "govener"],
                mormon: [
                    {my: "name"},
                    {is: "elder"},
                    {price: "cunningham"}
                ],
                good_data: [
                    {id: 23, hello: "hello"},
                    {id: 34, hello: "world"},
                    {id: 45, hello: "neighbor"}
                ]
            },
            {},
            function () {
                console.log("hello data");
                done();
            }
        );
    });

    it("should do the operations specified", function (done) {
        var flattertree = require('../src/flattertree'),
            dataTree = flattertree.connect("mongodb://localhost/generic");

        dataTree.insertNode(
            "directory",
            null,
            {hello: "world", object: {object: "stuff"}, arr: ["hello", "govener"], mormon: [{my: "name"}, {is: "elder"}, {price: "cunningham"}], good_data: [{id: 23, hello: "hello"}, {id: 34, hello: "world"}, {id: 45, hello: "neighbor"}]},
            {},
            function () {
                dataTree.insertNode("more_stuff", ",directory,", {I: "like", data: "sir"}, {}, function () {
                    console.log("about to find");
                    dataTree.fullNodeData(",directory,", function (err, data) {
                        if (err) {console.log(err); }
                        console.log("data = %j", data);
                        dataTree.findNode(",directory,", function (err, node) {
                            if (err) {console.log(err); }
                            console.log("node = %j", node);
                            dataTree.findFullNode(",directory,", function (err, data) {
                                if (err) {console.log(err); }
                                console.log("full data = %j", data);
                                dataTree.deleteNode(",directory,#arr,", function () {
                                    dataTree.updateNode(",directory,", {i: "feel", great: "now"}, {}, function () {
                                        dataTree.findNode(
                                            ",directory,",
                                            function (err, node) {
                                                if (err) {console.log(err); }
                                                console.log("node = %j", node);
                                                console.log("success");
                                                expect(true).toBe(true);
                                                done();
                                            }
                                        );
                                    });
                                });
                            });
                        });
                    });
                });
            }
        );
    });
});