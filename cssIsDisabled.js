function cssIsDisabled () {
  var cssdisabled = false // must be proven otherwise
  var testel = document.createElement('div')
  var currstyle
  testel.style.position = 'absolute'
  document.getElementsByTagName('body')[0].appendChild(testel)
  if (testel.currentStyle) {
    currstyle = testel.currentStyle['position']
  } else if (window.getComputedStyle) {
    currstyle = document.defaultView.getComputedStyle(testel, null).getPropertyValue('position')
  }
  cssdisabled = currstyle === 'static' ? true : false
  document.getElementsByTagName('body')[0].removeChild(testel)
  if (cssdisabled) {
    return true
  }
  return false
}

// if (cssIsDisabled()) {
//   do something if CSS is disabled
// }
