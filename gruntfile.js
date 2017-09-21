module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		exec: {
			tsc: 'tsc -p ./tsconfig.json --watch false'
		},
		copy: {
			moveApp: {
				files: [{
					expand: true,
					cwd: 'app/',
					src: ['**/*.*', '!**/*.ts', '!**/*.map'],
					dest: 'out/'
				}, {
					src: ['package.json'],
					dest: 'out/'
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask('compile', ['exec:tsc']);
	grunt.registerTask('move', ['copy:moveApp']);
	grunt.registerTask('preBuild', ['compile', 'move']);
}