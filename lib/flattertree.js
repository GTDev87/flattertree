/*jslint nomen: true */
'use strict';

var mongoose = require('mongoose'),
	fs = require('fs'),
	_ = require('underscore');


exports.connect = function (mongoLocation, callback) {
	mongoose.connect(mongoLocation, function () {
		var models_path = __dirname + '/models';
		fs.readdir(models_path, function (err, files) {
			if (err) { throw err; }
			_.each(files, function (file) { require(models_path + '/' + file); });
			callback(require('./node_operations/node_operations').operations());
		});
	});
};