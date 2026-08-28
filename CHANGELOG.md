## 2.1.0

- Added an opt-in feature to reset the page back to the markup the server originally sent when CSS fails. Supply a `snapshot` flag to `params` to capture the markup, then call `restoreInitialMarkup()` from the `detail` of the `cssDisabled` event to put it back. See the usage docs for the list of things this does not undo.
- Fixed a bug that would prevent the module from detecting that CSS is disabled by a Content Security Policy which forbids inline styles.
- Updated dependencies.

## 2.0.2

- Fixed a bug that would prevent the module from detecting new `<link>` tags inserted into the page after the DOM loads.
- Fixed a bug that would cause the module to remove CSS files overly aggressively.

## 2.0.1

- Fixed docs issues.
- Fixed bundling issue.
- Updated dependencies.

## 2.0.0

- Added feature to detect if stylesheets failed to load. If a CSS file fails to load, this module will emit an event called `cssDisabled`.
- Altered default behavior to take action if CSS is disabled:
  - If CSS is disabled at the browser level, this module will throw a JS error to prevent any further JS from executing.
  - If a CSS file fails to load, this module will remove all `<link>` tags and `<style>` tags from the DOM and emit the `cssDisabled` event so that you can undo any DOM manipulations and then stop any further JS from executing yourself.
  - Added a `justCheck` param to restore the previous default behavior of just checking if CSS is disabled. The new `cssDisabled` event will still fire if `justCheck` is set.
- Refactored the module considerably.
- Updated dependencies.

## 1.0.0

- First version.
