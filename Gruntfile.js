module.exports = function (grunt) {
   // Project configuration.
   grunt.initConfig({
      pkg: grunt.file.readJSON("package.json"),
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
            asi: true,
            maxcomplexity: 15,
            maxdepth: 3,
            maxparams: 5
         }
      },
      jsdoc: {
         dist: {
            src: ["src/*.js"],
            options: {
               dest: "doc"
            }
         }
      },
      "npm-command": {
         test: {
            options: {
               cmd: "run",
               args: ["test"]
            }
         },
         coverage: {
            options: {
               cmd: "run",
               args: ["coverage"]
            }
         }
      },
      coveralls: {
         io: {
            src: "coverage/*.info"
         }
      }
  });
   
   grunt.loadNpmTasks("grunt-contrib-uglify")
   grunt.loadNpmTasks("grunt-contrib-jshint")
   grunt.loadNpmTasks("grunt-jsdoc")
   grunt.loadNpmTasks("grunt-npm-command")
   grunt.loadNpmTasks("grunt-coveralls")
   
   grunt.registerTask("check", ["jshint"])
   grunt.registerTask("doc", ["jsdoc"])
   grunt.registerTask("test", ["npm-command:test"])
   grunt.registerTask("default", ["jshint", "npm-command:coverage", "coveralls", "jsdoc", "uglify"])
};
