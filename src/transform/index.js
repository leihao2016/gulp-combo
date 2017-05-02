'use strict';
var extname = require('../extname');

/**
 * Constants
 */
var TARGET_TYPES = ['html', 'dwt'];
var DEFAULT_TARGET = TARGET_TYPES[0];

/**
 * Transform module
 */
var transform = module.exports = exports = function (filepath, i, length, sourceFile, targetFile) {
  var type;
  if (targetFile && targetFile.path) {
    var ext = extname(targetFile.path);
    type = typeFromExt(ext);
  }
  if (!isTargetType(type)) {
    type = DEFAULT_TARGET;
  }
  var func = transform[type];
  if (func) {
    return func.apply(transform, arguments);
  }
};

/**
 * Options
 */

transform.selfClosingTag = false;

/**
 * Transform functions
 */
TARGET_TYPES.forEach(function(targetType) {
  transform[targetType] = function(filepath) {
    var ext = extname(filepath);
    var type = typeFromExt(ext);
    var func = transform[targetType][type];
    if (func) {
      return func.apply(transform[targetType], arguments);
    }
  };
});

transform.html.css = function (filepath) {
  //return '<link rel="stylesheet" href="' + filepath + '"' + end();
  return filepath;
};

transform.html.js = function (filepath) {
  //return '<script src="' + filepath + '"></script>';
  return filepath;
};


function typeFromExt(ext) {
  ext = ext.toLowerCase();
  return ext;
}

function isTargetType(type) {
  if (!type) {
    return false;
  }
  return TARGET_TYPES.indexOf(type) > -1;
}
