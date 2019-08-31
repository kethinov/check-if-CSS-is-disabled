# check-if-CSS-is-disabled

[![npm](https://img.shields.io/npm/v/check-if-css-is-disabled.svg)](https://www.npmjs.com/package/check-if-css-is-disabled)

Frontend JavaScript module that can determine if CSS is disabled in the browser.

# Install

`npm install check-if-css-is-disabled`

Module is distributed as a [browserify](http://browserify.org) module. After installing with npm, you can find the browserify bundle in `node_modules/check-if-css-is-disabled/dist/cssIsDisabled.js`.

Alternatively, you can load it from source by pulling `node_modules/check-if-css-is-disabled/cssIsDisabled.js` into your application, or by packing/bundling it yourself.

# Use

Once loaded into your application, usage is as follows:



```javascript
var cssIsDisabled = require('check-if-css-is-disabled')()
if (cssIsDisabled) {
  // do something if CSS is disabled
}
```

