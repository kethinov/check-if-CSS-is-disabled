require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/cssIsDisabled.js":[function(require,module,exports){
module.exports = function () {
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
  cssdisabled = currstyle === 'static'
  document.getElementsByTagName('body')[0].removeChild(testel)
  if (cssdisabled) {
    return true
  }
  return false
}

},{}]},{},[]);
