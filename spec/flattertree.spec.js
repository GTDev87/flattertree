/*jslint node: true, nomen: true */
/*globals describe, beforeEach, afterEach, it, expect */


describe("Manually ticking the Jasmine Mock Clock", function () {
    'use strict';
    var mongoose = require('mongoose'),
        Schema,
        NodeSchema,
        Node;

    mongoose.connect("mongodb://localhost/generic");

    Schema = mongoose.Schema;
    NodeSchema = new Schema({});

    NodeSchema.plugin(require('../src/models/node'));
    Node = mongoose.model('Node', NodeSchema);


    beforeEach(function (done) {
        mongoose.connection.db.dropDatabase(function () {
            done();
        });
    });

    it("should insert node", function (done) {
        Node.node().insert(
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
        Node.node().insert(
            "directory",
            null,
            {hello: "world", object: {object: "stuff"}, arr: ["hello", "govener"], mormon: [{my: "name"}, {is: "elder"}, {price: "cunningham"}], good_data: [{id: 23, hello: "hello"}, {id: 34, hello: "world"}, {id: 45, hello: "neighbor"}]},
            {},
            function () {
                Node.node().insert("more_stuff", ",directory,", {I: "like", data: "sir"}, {}, function () {
                    console.log("about to find");
                    Node.node().fullData(",directory,", function (err, data) {
                        if (err) {console.log(err); }
                        console.log("data = %j", data);
                        Node.node().find(",directory,", function (err, node) {
                            if (err) {console.log(err); }
                            console.log("node = %j", node);
                            Node.node().findFull(",directory,", function (err, data) {
                                if (err) {console.log(err); }
                                console.log("full data = %j", data);
                                Node.node().delete(",directory,#arr,", function () {
                                    Node.node().update(",directory,", {i: "feel", great: "now"}, {}, function () {
                                        Node.node().find(
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