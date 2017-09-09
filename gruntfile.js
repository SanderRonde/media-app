module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		exec: {
			tsc: 'tsc -p ./tsconfig.json --watch false'
		}
	});

	grunt.loadNpmTasks('grunt-exec');

	grunt.registerTask('compile', ['exec:tsc']);
}