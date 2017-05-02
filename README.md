# gulp-combo
动态合并标记内的js和css文件，组成nginx-concat格式的请求url，减少http请求。

# Contents

<!-- MDTOC maxdepth:2 firsth1:0 numbering:0 flatten:0 bullets:1 updateOnSave:1 -->

<!-- /MDTOC -->

## Installation

Install `gulp-combo` as a development dependency:

```shell
npm install --save-dev gulp-combo
```

## Basic usage

**The target file `src/index.html`:**

Each pair of comments are the injection placeholders (aka. tags, see [`options.starttag`](#optionsstarttag) and [`options.endtag`](#optionsendtag)).

```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
  <!-- combo:css -->
  <link rel="stylesheet" href="/src/a.css" />
  <link rel="stylesheet" href="/src/b.css" />
  <!-- endcombo -->
</head>
<body>

  <!-- combo:js -->
  <link rel="stylesheet" href="/src/a.js" />
  <link rel="stylesheet" href="/src/b.js" />
  <!-- endcombo -->
</body>
</html>
```

**The `gulpfile.js`:**

```javascript
var gulp = require('gulp');
var combo = require('gulp-combo');

gulp.task('tpl', function () {
  return gulp.src(TPL_SRC)
		.pipe(combo(gulp.src([JS_SRC, CSS_SRC]), {domain: '{$IMG}'}))
		.pipe(gulp.dest(TPL_DEST));
});
```
