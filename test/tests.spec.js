const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const express = require('express')
let server

test.describe('check-if-css-is-disabled', () => {
  test.beforeAll(async () => {
    const app = express()
    app.use(express.static(path.resolve(__dirname, '../')))
    server = app.listen(3000)
  })

  test.afterAll(async () => {
    server.close()
  })

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      // suppress specific errors
      const text = msg.text()
      if (text.includes('net::ERR_EMPTY_RESPONSE') ||
          text.includes('MIME type') ||
          text.includes('X-Content-Type-Options') ||
          text.includes('Content-Security-Policy') || // firefox spells it with hyphens
          text.includes('Content Security Policy')) { // chromium spells it with spaces
        return
      }
      // print everything else, including the test page's console logs
      console.log(msg.text())
    })
  })

  test.afterEach(async ({ page }) => {
    if (process.env.NYC_PROCESS_ID) {
      // extract coverage data
      const coverage = await page.evaluate(() => window.__coverage__)
      // write coverage data to a file
      if (coverage) fs.writeFileSync(path.join(process.cwd(), '.nyc_output', `coverage-${test.info().testId}.json`), JSON.stringify(coverage))
    }
  })

  test('should detect <link> tag does load css', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    const result = await page.evaluate(() => {
      const cssIsDisabled = window.checkIfCssIsDisabled({ justCheck: true })
      return cssIsDisabled
    })
    expect(result).toBe(false)
  })

  test('should detect <link> tag didn\'t load css', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagDoesNotLoad.html')
    const result = await page.evaluate(() => {
      const cssIsDisabled = window.checkIfCssIsDisabled({ justCheck: true })
      return cssIsDisabled
    })
    expect(result).toBe(true)
  })

  test('should detect <link> tag didn\'t load css and stop execution of the JS', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagDoesNotLoad.html')
    let error
    try {
      await page.evaluate(() => {
        const cssIsDisabled = window.checkIfCssIsDisabled()
        return cssIsDisabled
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.message).toContain('CSS is disabled. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  test('should detect <link> tag didn\'t load css and listen for cssDisabled event', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagDoesNotLoad.html')
    const result = await page.evaluate(() => {
      let eventData
      window.addEventListener('cssDisabled', (event) => {
        eventData = event.detail.message
      })
      const cssIsDisabled = window.checkIfCssIsDisabled({ justCheck: true })
      return { cssIsDisabled, eventData }
    })
    expect(result.cssIsDisabled).toBe(true)
    expect(result.eventData).toContain('At least one stylesheet failed to load. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  // Firefox's "View > Page Style > No Style" cannot be driven from Playwright: it's
  // docShell.authorStyleDisabled, which is chrome-privileged and unreachable from page
  // context, and the old layout.css.enabled pref no longer exists. What a CSS-disabled
  // browser actually presents to this module is an author style that never applies, so
  // these tests reproduce that signal directly by stubbing getComputedStyle to report the
  // UA default for position. Toggling the real browser feature still needs a manual
  // check: open test/linkTagLoads.html, pick View > Page Style > No Style, then run
  // checkIfCssIsDisabled() in the console.

  test('should detect when CSS is disabled', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    const result = await page.evaluate(() => {
      const real = document.defaultView.getComputedStyle.bind(document.defaultView)
      document.defaultView.getComputedStyle = (element, pseudoElement) => ({
        getPropertyValue: (property) => property === 'position' ? 'static' : real(element, pseudoElement).getPropertyValue(property)
      })
      try {
        let eventData
        window.addEventListener('cssDisabled', (event) => {
          eventData = event.detail.message
        })
        const cssIsDisabled = window.checkIfCssIsDisabled({ justCheck: true })
        return { cssIsDisabled, eventData }
      } finally {
        document.defaultView.getComputedStyle = real
      }
    })
    expect(result.cssIsDisabled).toBe(true)
    expect(result.eventData).toContain('CSS is disabled. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  test('should detect when CSS is disabled and stop execution of the JS', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    let error
    try {
      await page.evaluate(() => {
        const real = document.defaultView.getComputedStyle.bind(document.defaultView)
        document.defaultView.getComputedStyle = (element, pseudoElement) => ({
          getPropertyValue: (property) => property === 'position' ? 'static' : real(element, pseudoElement).getPropertyValue(property)
        })
        try {
          return window.checkIfCssIsDisabled()
        } finally {
          document.defaultView.getComputedStyle = real
        }
      })
    } catch (e) {
      error = e
    }
    expect(error).toBeDefined()
    expect(error.message).toContain('CSS is disabled. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  // unlike the two tests above, this one disables CSS for real: a Content-Security-Policy
  // of style-src 'none' makes the browser refuse the style attribute the module sets, so
  // the detection runs end to end with no stubbing
  test('should detect when CSS is disabled by a Content-Security-Policy', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/cssDisabledViaCsp.html')
    const result = await page.evaluate(() => {
      let eventData
      window.addEventListener('cssDisabled', (event) => {
        eventData = event.detail.message
      })
      const cssIsDisabled = window.checkIfCssIsDisabled({ justCheck: true })
      return { cssIsDisabled, eventData, linkTagError: !!window.linkTagError }
    })
    expect(result.cssIsDisabled).toBe(true)
    expect(result.eventData).toContain('CSS is disabled. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
    expect(result.linkTagError).toBe(false) // proves the disabled-CSS check fired, not the failed-asset check
  })

  test('should detect <link> tag doesn\'t load after the JS loads', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let eventData
        let eventFired = false
        window.addEventListener('cssDisabled', (event) => {
          eventData = event.detail.message
          eventFired = true
        })
        const cssIsDisabled = window.checkIfCssIsDisabled({ justCheck: true })
        setTimeout(() => {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'http://localhost:3000/test/nonexistent.css'
          document.head.appendChild(link)
        }, 1000)
        setTimeout(() => {
          resolve({ cssIsDisabled, eventData, eventFired })
        }, 2000)
      })
    })
    await page.waitForTimeout(1000) // wait for the event to be triggered
    expect(result.cssIsDisabled).toBe(false) // initially, css is not disabled
    expect(result.eventFired).toBe(true) // it should not remove the style or link tags
    expect(result.eventData).toContain('At least one stylesheet failed to load. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  test('should detect <link> tag doesn\'t load after the JS loads and remove <style> and <link> elements', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let eventData
        let tagsCorrect = false
        window.addEventListener('cssDisabled', (event) => {
          eventData = event.detail.message
          if (!document.querySelector('style') && !document.querySelector('link')) tagsCorrect = true
          else tagsCorrect = false
        })
        const cssIsDisabled = window.checkIfCssIsDisabled()
        setTimeout(() => {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'http://localhost:3000/test/nonexistent.css'
          document.head.appendChild(link)
        }, 1000)
        setTimeout(() => {
          resolve({ cssIsDisabled, eventData, tagsCorrect })
        }, 2000)
      })
    })
    await page.waitForTimeout(1000) // wait for the event to be triggered
    expect(result.cssIsDisabled).toBe(false) // initially, css is not disabled
    expect(result.tagsCorrect).toBe(true) // it should not remove the style or link tags
    expect(result.eventData).toContain('At least one stylesheet failed to load. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  test('should detect <link> tag doesn\'t load after the JS loads and remove <style> and <link> elements except the one on the exemption list', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let eventData
        let tagsCorrect = false
        window.addEventListener('cssDisabled', (event) => {
          eventData = event.detail.message
          if (document.querySelector('style') && !document.querySelector('link')) tagsCorrect = true
          else tagsCorrect = false
        })
        const cssIsDisabled = window.checkIfCssIsDisabled({ exemptedIds: ['styletag'] })
        setTimeout(() => {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'http://localhost:3000/test/nonexistent.css'
          document.head.appendChild(link)
        }, 1000)
        setTimeout(() => {
          resolve({ cssIsDisabled, eventData, tagsCorrect })
        }, 2000)
      })
    })
    await page.waitForTimeout(1000) // wait for the event to be triggered
    expect(result.cssIsDisabled).toBe(false) // initially, css is not disabled
    expect(result.tagsCorrect).toBe(true) // it should not remove the style or link tags
    expect(result.eventData).toContain('At least one stylesheet failed to load. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
  })

  test('should restore the initial markup when the snapshot flag is set', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagLoads.html')
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const out = {}
        let listenerFired = 0
        window.addEventListener('cssDisabled', (event) => {
          out.hasRestore = typeof event.detail.restoreInitialMarkup === 'function'
          out.firstCall = event.detail.restoreInitialMarkup()
          out.text = document.querySelector('p').textContent
          out.injectedGone = !document.getElementById('injected')
          out.classGone = !document.body.classList.contains('js-enhanced')
          document.querySelector('p').click() // the restored node carries no listener
          out.listenerFired = listenerFired
          out.secondCall = event.detail.restoreInitialMarkup() // restoring twice is safe
          out.textAfterSecond = document.querySelector('p').textContent
          resolve(out)
        })

        // the module runs first, capturing the markup as it was served
        window.checkIfCssIsDisabled({ justCheck: true, snapshot: true })

        // then the JS enhancements run
        const paragraph = document.querySelector('p')
        paragraph.addEventListener('click', () => { listenerFired++ })
        paragraph.textContent = 'enhanced by JS'
        document.body.classList.add('js-enhanced')
        document.body.insertAdjacentHTML('beforeend', '<b id="injected">injected by JS</b>')

        // then a stylesheet fails partway through the app's usage
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'http://localhost:3000/test/nonexistent.css'
        document.head.appendChild(link)
      })
    })
    expect(result.hasRestore).toBe(true)
    expect(result.firstCall).toBe(true)
    expect(result.text).toBe('hello') // the enhanced text is gone
    expect(result.injectedGone).toBe(true)
    expect(result.classGone).toBe(true)
    expect(result.listenerFired).toBe(0) // listeners die with the nodes they were bound to
    expect(result.secondCall).toBe(true)
    expect(result.textAfterSecond).toBe('hello')
  })

  test('should not expose restoreInitialMarkup when the snapshot flag is not set', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/linkTagDoesNotLoad.html')
    const result = await page.evaluate(() => {
      let detail
      window.addEventListener('cssDisabled', (event) => {
        detail = event.detail
      })
      window.checkIfCssIsDisabled({ justCheck: true })
      return { restore: typeof detail.restoreInitialMarkup, message: typeof detail.message }
    })
    expect(result.restore).toBe('undefined') // absent, so opting out is unambiguous
    expect(result.message).toBe('string')
  })

  // the two tests below pin the web component limitation documented in USAGE.md: restoring
  // inserts fresh copies of custom elements, so they upgrade and enhance themselves again
  // unless the developer deactivates them first
  const restoreWithWebComponent = (deactivateBeforeRestoring) => {
    return new Promise((resolve) => {
      const out = {}
      window.addEventListener('cssDisabled', (event) => {
        if (deactivateBeforeRestoring) window.componentsDisabled = true
        event.detail.restoreInitialMarkup()
        out.connectedCountAfter = window.connectedCount
        out.widgetTextAfter = document.getElementById('widget').textContent
        resolve(out)
      })

      // the module runs first, capturing <my-widget> before it has been upgraded
      window.checkIfCssIsDisabled({ justCheck: true, snapshot: true })

      // then the web component is registered, which upgrades and enhances the element
      window.connectedCount = 0
      window.componentsDisabled = false
      window.customElements.define('my-widget', class extends window.HTMLElement {
        connectedCallback () {
          if (window.componentsDisabled) return
          window.connectedCount++
          this.textContent = 'enhanced by web component'
        }
      })
      out.connectedCountBefore = window.connectedCount
      out.widgetTextBefore = document.getElementById('widget').textContent

      // then a stylesheet fails partway through the app's usage
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'http://localhost:3000/test/nonexistent.css'
      document.head.appendChild(link)
    })
  }

  test('should re-run web components when restoring, unless they are deactivated first', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/webComponent.html')
    const result = await page.evaluate(restoreWithWebComponent, false)
    expect(result.connectedCountBefore).toBe(1) // the component enhanced the element
    expect(result.widgetTextBefore).toBe('enhanced by web component')
    expect(result.connectedCountAfter).toBe(2) // restoring upgraded a fresh copy of it
    expect(result.widgetTextAfter).toBe('enhanced by web component') // so the enhancement came back
  })

  test('should leave web components alone when restoring if they are deactivated first', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000/test/webComponent.html')
    const result = await page.evaluate(restoreWithWebComponent, true)
    expect(result.connectedCountBefore).toBe(1)
    expect(result.widgetTextBefore).toBe('enhanced by web component')
    expect(result.connectedCountAfter).toBe(1) // connectedCallback bailed out
    expect(result.widgetTextAfter).toBe('plain markup') // the served markup survived
  })
})
