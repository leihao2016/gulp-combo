'use strict';

var path = require('path');

/*
 * 解析页面中的组件引用
 * {% widget file="filePath/fileName" %}
 */
function widget(file, opt) {
	if (!file) {
		return;
	}

	var 
		res = {},
		reg = /(?:\{\%|\/\/-)\s*widget\s*file=('|")(?:(.*))?('|")\s*name=('|")(?:(.*))?('|")\s*\%\}/,
		matchs = file.match(reg);

	res.path = matchs[2].replace(/..\//, '');
	res.name = matchs[5];
	res.prefix = res.path + '/' + res.name;
	res.html = res.prefix + '.html';
	res.js = res.prefix + '.js';
	res.css = res.prefix + '.css';	

	return res;
}

module.exports = widget;