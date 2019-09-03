module.exports = function () {
  var cssdisabled = false // must be proven otherwise
  var testel = document.createElement('div')
  var currstyle
  var body = document.body
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
