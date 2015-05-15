'use strict';

module.exports = function(grunt) {
    // Unified Watch Object
    var watchFiles = {
        libJS: ['gruntfile.js', 'index.js', 'lib/**/*.js'],
        testJS: ['test/**/*.js'],
    };

    // Project Configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            libJS: {
                files: watchFiles.libJS,
                tasks: ['jshint'],
                options: {
                    livereload: true
                }
            }
        },
        jshint: {
            all: {
                src: watchFiles.libJS.concat(watchFiles.testJS),
                options: {
                    jshintrc: true
                }
            }
        },
        env: {
            test: {
                NODE_ENV: 'test'
            }
        },
        mochaTest: {
            test : {
                src: watchFiles.testJS,
                options : {
                    reporter: 'spec',
                    timeout: 5 * 1000,
                    require: 'test/blanket'
                }
            },
            coverage: {
                src: watchFiles.testJS,
                options : {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage.html'
                }
            }
        },
        clean: {
            'coverage.html' : {
                src: ['coverage.html']
            }
        }
    });

    // Load NPM tasks
    require('load-grunt-tasks')(grunt);

    // Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    // Lint task(s).
    grunt.registerTask('lint', ['jshint']);

    // Test task.
    grunt.registerTask('test', ['clean', 'env:test', 'lint', 'mochaTest']);

    // Default task(s).
    grunt.registerTask('default', ['test']);
};
