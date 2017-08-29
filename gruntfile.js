module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		exec: {
			tsc: 'tsc -p ./tsconfig.json --watch false'
		},
		zip: {
			'using-cwd': {
				cwd: './app',
				src: ['app/**', 'app/**/*.ts'],
				dest: 'build/MediaApp.zip'
			}
		}
	});

	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask('build', ['zip']);
	grunt.registerTask('compile', ['exec:tsc']);
	grunt.registerTask('test', []);
}