module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    coffee:
      compile:
        options:
          join: true
        files:
          'build/<%= pkg.name %>-<%= pkg.version %>.js': [
            'src/utils/**/*.coffee'
            'src/player.coffee' # require?
            'src/start.coffee' # this solution is not seriously
            'src/**/*.coffee'
          ]

    concat:
      dist:
        src: ['src/**/*.js', 'build/<%= pkg.name %>-<%= pkg.version %>.js']
        dest: 'build/<%= pkg.name %>-<%= pkg.version %>.js'
    
    uglify:
      build:
        src: 'build/<%= pkg.name %>-<%= pkg.version %>.js'
        dest: 'build/<%= pkg.name %>-<%= pkg.version %>.min.js'

    watch:
      scripts:
        files: ['src/**/*.coffee', 'src/**/*.js']
        tasks: ['coffee', 'concat', 'uglify']

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'default', 'watch'