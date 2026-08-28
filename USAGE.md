# Install

`npm install check-if-css-is-disabled`

The package is distributed with the following builds available:

- `dist/check-if-css-is-disabled.cjs`: CommonJS bundle: `const cssIsDisabled = require('check-if-css-is-disabled')`
- `dist/check-if-css-is-disabled.js`: Standalone bundle that can be included via `<script>` tags. Declares a global variable called: `checkIfCssIsDisabled`
- `dist/check-if-css-is-disabled.min.js`: Minified standalone bundle that can be included via `<script>` tags. Declares a global variable called: `checkIfCssIsDisabled`
- `dist/check-if-css-is-disabled.mjs`: ES module: `import cssIsDisabled from 'check-if-css-is-disabled'`
- `dist/check-if-css-is-disabled.min.mjs`: Minified ES module: `import cssIsDisabled from 'check-if-css-is-disabled/min'`

# Use

Place this `<script>` tag with a small amount of inline JS before any `<link>` tags in your HTML:

```html
<script>window.addEventListener('error', (event) => { if (event?.target?.tagName === 'LINK') { window.linkTagError = true } }, true)</script>
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

## Restoring the initial markup

If CSS fails, any JS enhancements that already applied can leave the page in a worse state than no JS at all, because the enhanced DOM was designed for styles that aren't there. To help with that, this module can keep a copy of the markup exactly as the server sent it and hand you a function that puts it back.

This is opt-in, and restoring never happens automatically. Set the `snapshot` flag to `params` e.g. `{ snapshot: true }` to capture the markup, then call `restoreInitialMarkup()` yourself from your `cssDisabled` listener:

```javascript
const checkIfCssIsDisabled = require('check-if-css-is-disabled')

window.addEventListener('cssDisabled', (event) => {

  // tear down anything that must not survive the restore first here
  
  event.detail.restoreInitialMarkup() // puts the <body> back to how the server sent it
})

checkIfCssIsDisabled({ snapshot: true }) // call this before your enhancements run
```

`restoreInitialMarkup` is only present on `event.detail` when the `snapshot` flag was set, so its absence tells you that you never opted in.

### Limitations

Restoring replaces the `<body>`, and event listeners bound to the elements inside it die along with the nodes they were attached to. Several things are not covered, and the ones that matter most are the ones you should handle in your `cssDisabled` listener *before* calling `restoreInitialMarkup()`:

- **Custom elements re-run.** Restoring inserts fresh copies of your custom elements, so their constructors and `connectedCallback` run again and they re-enhance themselves. If your page uses web components, deactivate or unregister them in your listener before restoring, otherwise you will get an enhanced DOM back instead of the original markup.
- **`window` and `document` listeners survive.** They are not inside `<body>`, so restoring cannot remove them. Remove any you added yourself.
- **Form state resets.** Values typed by the user, checked boxes, and selected options all go back to how the page was served. Take care to avoid not destroying user input.
- **Timers, observers, and in-flight requests keep running.** `setInterval`, `requestAnimationFrame` loops, `MutationObserver`, `IntersectionObserver`, and pending `fetch` calls are unaffected. Clear them yourself.
- **Frameworks will not notice.** A framework that rendered into the page still holds references to the nodes that were just replaced. Its listeners are gone but its internal state is not, so it may log errors if something later tries to update. Tear the framework down before restoring.
