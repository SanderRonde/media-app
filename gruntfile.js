module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		zip: {
			'using-cwd': {
				cwd: './app',
				src: ['app/**'],
				dest: 'build/MediaApp.zip'
			}
		}
	});

	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask('build', ['zip']);
	grunt.registerTask('test', []);
}