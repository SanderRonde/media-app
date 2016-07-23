module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			build: {
				options: {
					banner: '/*Original can be found at https://github.com/SanderRonde/Youtube-Playlist-Saver */\n'
				},
				files: {
					src: [
						'app/*.js'
					],
					dest: 'build/'
				}
			}
		},
		copy: {
			main: {
				files: [
					{ expand: true, flatten: true, src: ['app/manifest.json'], dest: 'build/' },
					{ expand: true, flatten: true, src: ['app/img/*'], dest: 'build/img/' }
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('build', ['uglify', 'copy']);
}