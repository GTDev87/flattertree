/*jslint node: true, nomen: true */
'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jslint: {
            all: {
                src: [
                    './**/*.js',
                    './package.json'
                ],
                exclude: [
                    './node_modules/**/*.js'
                ],
                options: {  }
            }
        },
        jasmine_node: {
            specNameMatcher: "spec",
            projectRoot: ".",
            useHelpers: true
        }
    });
    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-jasmine-node');

    return grunt.registerTask('default', ['jslint', 'jasmine_node']);
};