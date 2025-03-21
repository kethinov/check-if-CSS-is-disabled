module.exports = (params) => {
  const justCheck = !!params?.justCheck
  const exemptedIds = params?.exemptedIds || []

  // check if any CSS assets fail to load
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    link.addEventListener('error', handleCssAssetFailingToLoad)
  })

  // use MutationObserver to attach error event listener to new link tags
  const observer = new window.MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            node.addEventListener('error', handleCssAssetFailingToLoad)
          }
        })
      }
    }
  })

  // start observing the document for added nodes
  observer.observe(document.head, { childList: true, subtree: true })

  function handleCssAssetFailingToLoad (errorEvent) {
    if (errorEvent) window.linkTagError = true

    // remove all stylesheets if any fail to load, but only if the justCheck flag is falsey
    if (!justCheck && window.linkTagError) {
      for (const link of document.querySelectorAll('link[rel="stylesheet"]')) if (!exemptedIds.includes(link.id)) link.remove()
      for (const style of document.querySelectorAll('style')) if (!exemptedIds.includes(style.id)) style.remove()
    }
    if (window.linkTagError) {
      window.dispatchEvent(new CustomEvent('cssDisabled', {
        detail: {
          message: 'At least one stylesheet failed to load. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.'
        }
      }))
      return true
    } else return !!errorEvent // return true if this function is called by an error event and return false if it is called directly below and no previous error has been logged
  }

  // test if the browser has explicitly disabled CSS
  let cssDisabled = false // must be proven otherwise
  const testElement = document.createElement('div')
  testElement.style.position = 'absolute'
  document.body.appendChild(testElement)
  cssDisabled = document.defaultView.getComputedStyle(testElement, null).getPropertyValue('position') === 'static'
  document.body.removeChild(testElement)

  // if the justCheck flag is present, we only want to notify the developer that CSS is disabled, not take any actions
  if (justCheck) {
    if (cssDisabled) {
      window.dispatchEvent(new CustomEvent('cssDisabled', {
        detail: {
          message: 'CSS is disabled. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.'
        }
      }))
      return true
    } else return handleCssAssetFailingToLoad()
  } else { // if the justCheck flag is not present, then stop execution of the JS if CSS is disabled
    if (cssDisabled || handleCssAssetFailingToLoad()) throw new Error('CSS is disabled. It is unsafe to execute any further JavaScript if the CSS has not loaded properly.')
    else return false
  }
}
