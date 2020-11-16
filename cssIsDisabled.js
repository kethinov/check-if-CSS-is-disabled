module.exports = function () {
  let cssdisabled = false // must be proven otherwise
  const testel = document.createElement('div')
  let currstyle
  const body = document.body
  testel.style.position = 'absolute'
  body.appendChild(testel)
  if (testel.currentStyle) {
    currstyle = testel.currentStyle.position
  } else if (window.getComputedStyle) {
    currstyle = document.defaultView.getComputedStyle(testel, null).getPropertyValue('position')
  }
  cssdisabled = currstyle === 'static'
  body.removeChild(testel)
  if (cssdisabled) {
    return true
  }
  return false
}
