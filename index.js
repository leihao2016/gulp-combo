
'use strict';

var 
	through = require('through2'),
	gutil = require('gulp-util'),
	PluginError = gutil.PluginError,
	magenta = gutil.colors.magenta,
	streamToArray = require('stream-to-array'),
	groupArray = require('group-array'),
	escapeStringRegexp = require('escape-string-regexp'),

	tags = require('./src/tags'),
	getFilepath = require('./src/path'),
	extname = require('./src/extname'),
	transform = require('./src/transform');
	//widget = require('./src/widget');

const PLUGIN_NAME = 'gulp-combo';
const DEFAULT_NAME_FOR_TAGS = 'combo';
const LEADING_WHITESPACE_REGEXP = /^\s*/;

var noop = function noop() {};

// 入口
module.exports = exports = function(sources, opt) {
	if (!sources) {
		throw error('Missing sources stream!');
	}

	opt = opt || {};

	opt.quiet = bool(opt, 'quiet', false);
	opt.relative = bool(opt, 'relative', false);
	opt.addRootSlash = bool(opt, 'addRootSlash', !opt.relative);
	opt.transform = defaults(opt, 'transform', transform);
	opt.tags = tags();
	opt.name = DEFAULT_NAME_FOR_TAGS;

	if (typeof sources.on === 'function' && typeof sources.pipe === 'function') {
		return handleVinylStream(sources, opt);
	}
};

function defaults(options, prop, defaultValue) {
 	return options[prop] || defaultValue;
}

function bool(options, prop, defaultVal) {
 	return typeof options[prop] === 'undefined' ? defaultVal : Boolean(options[prop]);
}

// 处理文件流
function handleVinylStream(sources, opt) {
	var collected = streamToArray(sources);

	return through.obj(function(file, enc, cb){
		if (file.isStream()) {
			cb(error('Streams not supported for target templates!'));
		}

		collected.then(function(collection){
			file.contents = getNewContent(file, collection, opt);
			this.push(file);
			cb();
		}.bind(this)).catch(function(err){
			cb(err);
		});
	});
}

// 重组内容
function getNewContent(file, collection, opt) {
	var logger = opt.quiet ? noop : function(filesCount) {
		if (filesCount) {
			log(cyan(filesCount) + ' files into ' + magenta(file.relative) + '.');
		} else {
			log('Nothing to combo into ' + magenta(file.relative) + '.');
		}
	};

	var 
		content = String(file.contents),
		fileExt = extname(file.path), // 文件后缀名
		files = prepareFiles(collection, fileExt, opt, file),
		filesPerTags = groupArray(files, 'tagKey'),
		startAndEndTags = Object.keys(filesPerTags),
		matches = [],
		comboedFilesCount = 0;
//console.log(file.path)
	// 处理widget
	//var res = widget(content);

	startAndEndTags.forEach(function(tagKey){
		var 
			files = filesPerTags[tagKey],
			startTag = files[0].startTag,
			endTag = files[0].endTag,
			tagsToCombo = getTagsToCombo(files, file, opt);

		content = combo(content, {
			//attach: res,
			ext: files[0].ext,
			domain: opt.domain,
			startTag: startTag,
			endTag: endTag,
			tagsToCombo: tagsToCombo,
			removeTags: opt.removeTags,
			empty: opt.empty,
			willCombo: function(filesToCombo) {
				comboedFilesCount += filesToCombo.length;
			},
			onMatch: function(match) {
				matches.push(match[0]);
			}
		});
	});

	//logger(comboedFilesCount);

	if (opt.empty) {
		var ext = '{{ANY}}';
		var startTag = getTagRegExp(opt.tags.start(targetExt, ext, opt.starttag), ext, opt);
		var endTag = getTagRegExp(opt.tags.end(targetExt, ext, opt.starttag), ext, opt);

		content = combo(content, {
			//attach: res,
			domain: opt.domain,
			startTag: startTag,
			endTag: endTag,
			tagsToCombo: [],
			removeTags: opt.removeTags,
			empty: opt.empty,
			shouldAbort: function (match) {
				return matches.indexOf(match[0]) !== -1;
			}
		});
	}

	return new Buffer(content);
}

function combo(content, opt) {
	var 
		startTag = opt.startTag,
		endTag = opt.endTag,
		startMatch,
		endMatch;

	while ((startMatch = startTag.exec(content)) !== null) {
		if (typeof opt.onMatch === 'function') {
			opt.onMatch(startMatch);
		}
		if (typeof opt.shouldAbort === 'function' && opt.shouldAbort(startMatch)) {
			continue;
		}

		endTag.lastIndex = startTag.lastIndex;
		endMatch = endTag.exec(content);

		if (!endMatch) {
			throw error('Missing end tag for start tag: ' + startMatch[0]);
		}

		var toCombo = opt.tagsToCombo.slice(), toComboArr = [];
		toCombo.forEach(function(item){
			toComboArr.push(item.replace(/^\/src\//, ''));
		});
		
		var 
			urlPer = opt.domain + '??',
			htmlTag = '';

		toComboArr = toComboArr.join(',');
		switch (opt.ext) {
			case 'css':
				htmlTag = '<link rel="stylesheet" type="text/css" href="'+ urlPer + toComboArr +'" />';
				break;
			case 'js':
				htmlTag = '<script type="text/javascript" src="'+ urlPer + toComboArr +'"></script>';
		}
		toCombo = htmlTag;

		if (typeof opt.willCombo === 'function') {
			opt.willCombo(toCombo);
		}

		var newContents = content.slice(0, startMatch.index);

		//toCombo.unshift(startMatch[0]);
		//toCombo.push(endMatch[0]);

		var 
			previousInnerContent = content.substring(startTag.lastIndex, endMatch.index),
			indent = getLeadingWhitespace(previousInnerContent);

		newContents += toCombo;
		newContents += content.slice(endTag.lastIndex);
		content = newContents;
	}

	return content;
}

function prepareFiles(files, targetExt, opt, target) {
	return files.map(function(file) {
		var ext = extname(file.path);
		var filePath = getFilepath(file, target, opt);
		var startTag = getTagRegExp(opt.tags.start(targetExt, ext, opt.starttag), ext, opt, filePath);
		var endTag = getTagRegExp(opt.tags.end(targetExt, ext, opt.starttag), ext, opt, filePath);
		var tagKey = String(startTag) + String(endTag);
		return {
			file: file,
			ext: ext,
			startTag: startTag,
			endTag: endTag,
			tagKey: tagKey
		};
	});
}

function getTagsToCombo(files, target, opt) {
	return files.reduce(function transformFile(lines, file, i, files) {
		var filepath = getFilepath(file.file, target, opt);
		var transformedContents = opt.transform(filepath, file.file, i, files.length, target);
		
		if (typeof transformedContents !== 'string') {
			return lines;
		}

		return lines.concat(transformedContents);
	}, []);
}

function getLeadingWhitespace(str) {
	return str.match(LEADING_WHITESPACE_REGEXP)[0];
}

function getTagRegExp(tag, sourceExt, opt, sourcePath) {
	tag = makeWhiteSpaceOptional(escapeStringRegexp(tag));
	tag = replaceVariables(tag, {
		name: opt.name,
		path: sourcePath,
		ext: sourceExt
	});
	return new RegExp(tag, 'ig');
}

function replaceVariables(str, variables) {
	return Object.keys(variables).reduce(function(str, variable) {
		return str.replace(new RegExp(escapeStringRegexp(escapeStringRegexp('{{' + variable + '}}')), 'ig'), variables[variable] + '\\b');
	}, str);
}

function makeWhiteSpaceOptional(str) {
 	return str.replace(/\s+/g, '\\s*');
}

function log(message) {
 	gutil.log(magenta(PLUGIN_NAME), message);
}

function error(message) {
 	return new PluginError(PLUGIN_NAME, message);
}
