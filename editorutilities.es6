/*    In a bid for structural coherence, I've moved all the Editor's
      untility functions into this file. In theory, this leaves me
      able to see the basic functionality of the Editor...
      Functions here are:
  getScaleMinMaxIncr
  unpickConfig

*/

export function sayHi() {
  return 'Hi!!';
}


// MIN MAX OBJECT
// Passed 3 args: actual min val; actual max val; ideal number of increment-steps
// Returns obj with 4 properties: min, max, increment and an updated step-count
/*
getScaleMinMaxIncr(minVal, maxVal, stepNo) {
  const mmObj = {};
  // Array of "acceptable" increments
  const plausibleIncrs = EditorConfig.operations.plausibleIncrements;
  let min = 0;
  let max = 0;
  // Min can't exceed zero; max can't be less than zero
  minVal = Math.min(0, minVal);
  maxVal = Math.max(0, maxVal);
  // Do (max-min) / steps to get a raw increment
  let incr = (maxVal - minVal) / stepNo;
  // Increment is presumably imperfect, so loop through
  // the array of values, raising the increment
  // to the next acceptable value
  for (let i = 0; i < plausibleIncrs.length; i++) {
    const plausVal = plausibleIncrs[i];
    if (plausVal >= incr) {
      incr = plausVal;
      break;
    }
  }
  // From zero, lower min to next acceptable value on or below inherited min
  while (Math.floor(min) > Math.floor(minVal)) {
    min -= incr;
  }
  // From zero, raise max to next acceptable value on or above inherited max
  while (max < maxVal) {
    max += incr;
  }
  // Revise number of ticks?
  const ticks = (max - min) / incr;
  mmObj.min = min;
  mmObj.max = max;
  mmObj.increment = incr;
  mmObj.ticks = ticks;
  return mmObj;
}
*/
// MIN MAX OBJECT ends

// UNPICK CONFIG
// Reshape form values to suit SilverBullet, then pass back...
/*
unpickConfig(eForm) {
  // Get actual values:
  const editorVals = eForm.getValue();
  // We plan to return a config object...
  // ...which is invalid by default
  const config = { isValid: false };
  // NOTE: for now, hard-code in context and style properties:
  const context = this.props.contextString;
  config.context = context;
  const style = 'bars';
  config.style = style;
  // Get gap from specific config node and pass it down...
  config.gap = this.state.specificStyle.gap;
  // Find out what we can from the data
  // (data, headers, min/max/incr, point/seriesCount, longestCatString)
  const dataObj = this.unpickTsv(editorVals.data);
  // Check validity:
  if (!dataObj.isValid) {
    console.log(dataObj.validityMsg);
    return config;
  }
  // So dataObj yields various properties that we need.
  // Data:
  config.data = dataObj.data;
  // Min/max/increment:
  // NOTE: HARD-WIRED TO SINGLE-SCALE AT PRESENT.
  // *** Will need to work with 2 scales on scatter charts, eventually...
  // AND PROBABLY IN THE WRONG PLACE -- MOVES DOWN TO ChartWrapper, or something...
  const ticks = this.state.specificContext.general.ticks;
  const mmiObj = this.getScaleMinMaxIncr(dataObj.minVal, dataObj.maxVal, ticks);
  // NOTE: and the hard-wiring to 'print' is problematic
  // Unpick:
  config.minmax = mmiObj;
  // Next comm'd out... I think because tick count is size-related...
  // NOTE: but watch out, now we can tweak chart width...
  // config.ticks = mmiObj.ticks;
  // Do I have to force the chart height (eg bar chart)...?
  // Get context-specific margins
  // NOTE: messy here...?
  config.pointCount = dataObj.pointCount;
  config.seriesCount = dataObj.seriesCount;
  config.longestCatString = dataObj.longestCatString;
  // config strings:
  const strKeys = Object.keys(editorVals.strings);
  const strObj = {};
  for (const iii in strKeys) {
    const key = strKeys[iii];
    strObj[key] = { content: editorVals.strings[key] };
  }
  config.strings = strObj;
  // Width and height of outerbox:
  const dimObj = { outerbox: {} };
  dimObj.outerbox.width = editorVals.dimensions.width;
  dimObj.outerbox.height = editorVals.dimensions.height;
  config.dimensions = dimObj;
  // Headers (for D3 colour mapping)
  config.headers = dataObj.headers;
  // Still here? Must (ha!) be OK...
  config.isValid = true;
  return config;
}
*/
// UNPICK CONFIG ends
