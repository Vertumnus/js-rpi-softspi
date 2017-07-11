module.exports = function (grunt) {
   // Project configuration.
   grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      uglify: {
         options: {
            banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"dd-mm-yyyy\") %> */\n"
         },
         dist: {
            files: {
               "lib/<%= pkg.name %>.min.js": ["src/*.js"]
            }
         }
      },
      jshint: {
         files: ["Gruntfile.js", "src/*.js", "test/*.js"],
         options: {
            esversion: 6,
            asi: true
         }
      },
      nodeunit: {
         all: ["test/tst_*.js"]
      },
      jsdoc: {
         dist: {
            src: ['src/*.js'],
            options: {
               dest: 'doc'
            }
         }
      }
   });
   
   grunt.loadNpmTasks('grunt-contrib-uglify')
   grunt.loadNpmTasks('grunt-contrib-jshint')
   grunt.loadNpmTasks('grunt-contrib-nodeunit')
   grunt.loadNpmTasks('grunt-jsdoc')
   
   grunt.registerTask('check', ['jshint'])
   grunt.registerTask('doc', ['jsdoc'])
   grunt.registerTask('test', ['nodeunit'])
   grunt.registerTask('default', ['jshint', 'jsdoc', 'uglify', 'nodeunit'])
};
