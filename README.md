# check-if-CSS-is-disabled

[![Build Status](https://github.com/rooseveltframework/check-if-css-is-disabled/workflows/CI/badge.svg
)](https://github.com/rooseveltframework/check-if-css-is-disabled/actions?query=workflow%3ACI) [![npm](https://img.shields.io/npm/v/check-if-css-is-disabled.svg)](https://www.npmjs.com/package/check-if-css-is-disabled)

Frontend JavaScript module that can determine if CSS is disabled or if it failed to load, then take action to stop JS enhancements from applying if the CSS isn't working first.

If your CSS fails to load but your JS does load, that can lead to mangled-looking user interfaces. But if you build your website using a [progressive enhancement](https://en.wikipedia.org/wiki/Progressive_enhancement) technique, this module will also let you do graceful degradation elegantly by making it easy for you to revert to the non-CSS and non-JS experience if your CSS fails but your JS doesn't.

As such, if no CSS or JS loads but you built your site using [semantic HTML](https://en.wikipedia.org/wiki/Semantic_HTML), it should still look reasonably good with the default styles applied and function reasonably well so long as no JS is mucking with the DOM.

This module was built and is maintained by the [Roosevelt web framework](https://github.com/rooseveltframework/roosevelt) [team](https://github.com/orgs/rooseveltframework/people), but it can be used independently of Roosevelt as well.

# Install

`npm install check-if-css-is-disabled`

The package is distributed with the following builds available:

- `dist/check-if-css-is-disabled.cjs`: CommonJS bundle: `const cssIsDisabled = require('check-if-css-is-disabled')`
- `dist/check-if-css-is-disabled.js`: Standalone bundle that can be included via `<script>` tags. Declares a global variable called: `checkIfCssIsDisabled`
- `dist/check-if-css-is-disabled.min.js`: Minified standalone bundle that can be included via `<script>` tags. Declares a global variable called: `checkIfCssIsDisabled`
- `dist/check-if-css-is-disabled.mjs`: ES module: `import cssIsDisabled from 'check-if-css-is-disabled'`
- `dist/check-if-css-is-disabled.min.mjs`: Minified ES module: `import cssIsDisabled from 'check-if-css-is-disabled/min'`

# Usage

Place this `<script>` tag with a small amount of inline JS above any `<link>` tags in your HTML:

```html
<script>window.addEventListener('error', (event) => { if (event?.target?.tagName?.toLowerCase() === 'link') { window.linkTagError = true } }, true)</script>
```

That will make it possible for this library to listen for any CSS files that fail to load.

It's important for that script to be inlined *before* any `<link>` tags so that if any `<link>` tag fails to load, this module will be made aware of that even if this module is initialized after the CSS files are loaded or fail to load.

Then in your JavaScript, include this module before any other JS executes. Here's an example using the CommonJS version:

```javascript
// this will stop the JS from executing if CSS is disabled or a CSS file fails to load; it will also remove any existing CSS from the DOM
require('check-if-css-is-disabled')()
```

By default, this module will take the following actions in response to CSS being disabled or any `<link>` tag failing to load:

- If CSS is disabled at the browser level, this module will throw a JS error to prevent any further JS from executing.
- If a CSS file fails to load at any time during your application's execution, this module will remove all `<link>` tags and `<style>` tags from the DOM and emit the `cssDisabled` event so that you can undo any DOM manipulations and then stop any further JS from executing yourself.
  - You can exempt certain `<link>` or `<style>` tags from being removed by supplying a list of IDs to `params`, e.g. `{ exemptedIds: ['someTagToKeepById', 'someOtherTagToKeepById', 'etc'] }` where an example tag to not remove would be `<style id="someTagToKeep">...</style>`.

To listen for the `cssDisabled` event, do this:

```javascript
window.addEventListener('cssDisabled', (event) => {
  // undo any DOM manipulations and then stop any further JS from executing
  document.body.classList.replace('js', 'no-js') // example DOM manipulation to undo
  throw new Error('A CSS file failed to load at some point during the app\'s usage. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
})
```

You can prevent any of the above actions from being taken by supplying a `justCheck` flag to `params` e.g. `{ justCheck: true }`, after which you can handle responding to CSS being disabled or a `<link>` tag not loading entirely yourself like this:

```javascript
const checkIfCssIsDisabled = require('check-if-css-is-disabled')
const cssIsDisabled = checkIfCssIsDisabled({ justCheck: true }) // the constructor will return `true` if CSS is disabled and `false` if it is not; all params are optional
if (cssIsDisabled) {
  // do things if CSS is disabled
}
```

*(The `cssDisabled` event will be emitted regardless of whether the `justCheck` flag is set to true or not.)*
