module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		zip: {
			'using-cwd': {
				cwd: 'build/',
				src: ['app/**'],
				dest: 'build/Youtube Music App.zip'
			}
		}
	});

	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask('build', ['zip']);
	grunt.registerTask('test', []);
}