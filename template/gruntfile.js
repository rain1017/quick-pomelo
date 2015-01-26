'use strict';

module.exports = function(grunt) {
	// Unified Watch Object
	var watchFiles = {
		serverJS: ['gruntfile.js', 'app.js', 'app/**/*.js'],
		testJS: ['test/**/*.js'],
	};

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		watch: {
			serverJS: {
				files: watchFiles.serverJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			}
		},
		jshint: {
			all: {
				src: watchFiles.serverJS.concat(watchFiles.testJS),
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
		nodemon: {
			dev: {
				script: 'app.js',
				options: {
					nodeArgs: ['--debug'],
					ext: 'js,html',
					watch: watchFiles.serverJS
				}
			}
		},
		'node-inspector': {
			custom: {
				options: {
					'web-port': 8088,
					'web-host': 'localhost',
					'debug-port': 5858,
					'save-live-edit': true,
					'no-preload': true,
					'stack-trace-limit': 50,
					'hidden': []
				}
			}
		},
		concurrent: {
			default: ['nodemon', 'watch'],
			debug: ['nodemon', 'watch', 'node-inspector'],
			options: {
				logConcurrentOutput: true,
				limit: 10
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

	// Default task(s).
	grunt.registerTask('default', ['clean', 'lint', 'concurrent:default']);

	// Debug task.
	grunt.registerTask('debug', ['clean', 'lint', 'concurrent:debug']);

	// Test task.
	grunt.registerTask('test', ['clean', 'env:test', 'lint', 'mochaTest']);
};
