/*jslint node: true, nomen: true */

function connect(mongoLocation, callback) {
    'use strict';

    var mongoose = require('mongoose'),
        fs = require('fs'),
        _ = require('lodash');


    mongoose.connect(mongoLocation, function () {
        var models_path = __dirname + '/models';
        fs.readdir(models_path, function (err, files) {
            if (err) { throw err; }
            _.each(files, function (file) { require(models_path + '/' + file); });
            callback(require('./node_operations/node_operations').operations());
        });
    });
}

module.exports = {
    connect: connect
};