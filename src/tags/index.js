
/**
 * Constants
 */
var DEFAULT_TARGET = 'html';

var DEFAULTS = {
    STARTS: {
        html: '<!-- {{name}}:{{ext}} -->',
        dwt: '<!-- {{name}}:{{ext}} -->'
    },

    ENDS: {
        html: '<!-- endcombo -->',
        dwt: '<!-- endcombo -->'
    }
};

module.exports = function tags() {
    return {
        start: getTag.bind(null, DEFAULTS.STARTS),
        end: getTag.bind(null, DEFAULTS.ENDS)
    };
};

function getTag(defaults, targetExt, sourceExt, defaultValue) {
    var tag = defaultValue;
    if (!tag) {
        tag = defaults[targetExt] || defaults[DEFAULT_TARGET];
    } else if (typeof tag === 'function') {
        tag = tag(targetExt, sourceExt);
    }
    return tag;
}
