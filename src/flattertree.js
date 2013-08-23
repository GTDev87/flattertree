/*jslint node: true, nomen: true */

function connect(mongoLocation) {
    'use strict';

    var mongoose = require('mongoose');

    require(__dirname + '/models/node');
    mongoose.connect(mongoLocation);

    return require('./node_operations/node_operations').operations();
}

module.exports = {
    connect: connect
};