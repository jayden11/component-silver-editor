import React from 'react';
import EditorSchema from './assets/editorschema.json';
import EditorConfig from './assets/editorconfig.json';
// * global document */

export default class SilverEditor extends React.Component {

  static get propTypes() {
    return {
      operations: React.PropTypes.object.isRequired,
      widthsArray: React.PropTypes.array,
      passUpdatedConfig: React.PropTypes.func.isRequired,
    };
  }

  // DEFAULT PROPS
  // default operations props here for now:
  static get defaultProps() {
    return {
      operations: {
        ticks: 5,
        plausibleIncrements: [ 0.25, 0.5, 1, 2, 3, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000 ],
      },
      widthsArray: [ 155, 220, 300 ],
    };
  }

  // COMPONENT DID MOUNT
  componentDidMount() {
    /* eslint-disable id-match */
    /* eslint-disable no-undef */
    /* eslint-disable no-console */
    /* eslint-disable camelcase */
    const schemaObj = {};
    schemaObj.schema = EditorSchema;
    // 2 options disable unwanted elements:
    schemaObj.disable_edit_json = true;
    schemaObj.disable_properties = true;
    this.editorForm = new JSONEditor(document.getElementById('json-editor'), schemaObj);
    // Remove the root 'Collapse' button:
    // this.editorForm.getEditor('root').toggle_button.remove();
    // Intercept tabs in raw data text area, to prevent default focus-shift...
    const textarea = document.querySelectorAll('.form-control textarea')[0];
    textarea.onkeydown = this.catchTabEvent.bind(this);
    // Intercept column-count change:
    const columnDropDown = document.querySelectorAll('.form-control select')[0];
    columnDropDown.onchange = this.catchColumnEvent.bind(this);
    // const colDD = this.editorForm.root.getChildEditors().dimensions.editors.columns;
    // this.editorForm.watch('root.dimensions.columns', function(e) {
    //    debugger;
    // });
    this.editorForm.on('change', () => {
      if (this.validateForm(this.editorForm)) {
        // Do the TSV-to-Json conversion and check the validity of the data
        const unpickedConfig = this.unpickConfig(this.editorForm);
        // Check the config object's 'isValid' flag:
        if (unpickedConfig.isValid) {
          // Data has passed both validity checks.
          // Update height recommendation for bar charts:
          // this.editorForm.getEditor('root.dimensions.height').label.textContent
          // Display recommended height (if bar chart):
          this.showBarHeightRecommendation(unpickedConfig);
          // And pass the config object back to SilverBullet:
          this.passConfigToSibyl(unpickedConfig);
        } else {
          console.log('Invalid data: details to be enumerated eventually...');
        }
      } else {
        console.log('Invalid data: check form for details...');
      }
    });
  }
  // COMPONENT DID MOUNT ends

  // SHOW BAR HEIGHT RECOMMENDATION
  // Called from componentDidMount. Passed the validated config object,
  // if this is a bar chart, calculates and displays the recommended
  // height based on number of bars...
  // NOTE: I'll have to catch stacked and overlapping bars eventually...
  showBarHeightRecommendation(config) {
    // NOTE: chart style hard-coded here for now. Eventually get style from editorForm...
    const style = 'bars';
    /*
      NOTE: original version used label...
      const hLabel = this.editorForm.getEditor('root.dimensions.height').label;
      let str = 'Height (pts/px';
      if (style === 'bars') {
        str += ` - recommended: ${this.getBarChartHeight(config)}`;
      }
      str += ')';
      hLabel.textContent = str;
    */
    // Default returned for non-bars:
    // let str = '<span></span>';
    const hDescrip = this.editorForm.getEditor('root.dimensions.height').description;
    if (style === 'bars') {
      // hDescrip.innerHTML = 'Recommended height: <span>120px</span>. Click to use...'
      hDescrip.innerHTML = `Recommended height: <span>${this.getBarChartHeight(config)}pts</span>. Click to use...`;
      // Reset event on span:
      const barRecommendSpan = document.querySelectorAll('.form-control p span')[0];
      barRecommendSpan.onclick = this.catchBarSpanEvent.bind(this);
    } else {
      hDescrip.innerHTML = '';
    }
  }
    // SHOW BAR HEIGHT RECOMMENDATION

  // VALIDATE FORM
  // I can't separate detailed validation of the raw data
  // from unpicking. so this just runs JsonEditor's validation.
  // This is fairly basic: value types (string, interger) and lengths (min/max)
  validateForm(eForm) {
    let isValid = true;
    const errors = eForm.validate();
    if (errors.length > 0) {
      // console.log(`Oops! Found ${errors.length} errors...`);
      isValid = false;
    }
    return isValid;
  }
  // VALIDATE FORM ends

  // UNPICK CONFIG
  // Reshape form values to suit SilverBullet, then pass back...
  unpickConfig(eForm) {
    // Get actual values:
    const editorVals = eForm.getValue();
    // We plan to return a config object...
    // ...which is invalid by default
    const config = { isValid: false };
    // NOTE: for now, hard-code in context and style properties:
    config.context = 'print';
    config.style = 'bars';
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
    // *** Careful: HARD-WIRED TO SINGLE-SCALE AT PRESENT.
    // *** Will need to work with 2 scales on scatter charts, eventually...
    // AND PROBABLY IN THE WRONG PLACE -- MOVES DOWN TO ChartWrapper, or something...
    const mmiObj = this.getScaleMinMaxIncr(dataObj.minVal, dataObj.maxVal, this.props.operations.ticks);
    // Unpick:
    config.minmax = mmiObj;
    // Next comm'd out... I think because tick count is size-related...
    // NOTE: but watch out, now we can tweak chart width...
    // config.ticks = mmiObj.ticks;
    // Do I have to force the chart height (eg bar chart)...?
    // Get context-specific margins
    // NOTE: messy here -- I'm sure some of this needs clearing out...
    // const margins = EditorConfig.dimensions[config.context].margins;
    // const forcedHeight = this.barChartForcedHeight(dataObj, margins);
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
    // dimObj.outerbox.height = forcedHeight;
    dimObj.outerbox.height = editorVals.dimensions.height;
    config.dimensions = dimObj;
    // Headers (yes: we need these for D3 colour mapping)
    config.headers = dataObj.headers;
    // Still here? Must (ha!) be OK...
    config.isValid = true;
    return config;
  }
  // RETURN CONFIG ends

  // PASS CONFIG TO SIBYL
  // Simply lobs the config object back up the tree
  passConfigToSibyl(config) {
    this.props.passUpdatedConfig(config);
  }
  // PASS CONFIG TO SIBYL ends

  // GET BAR CHART HEIGHT
  // Some styles -- well, bar charts, anyway -- force the chart height
  // Param is the validated config object
  getBarChartHeight(config) {
    // NOTE: hard-coded to print for now...
    const context = 'print';
    // Chart style: this could be 'sidebyside', 'stacked', or 'overlap'
    // NOTE: hard-coded for now...
    const chartStyle = 'sidebyside';
    // Get default margins (not user-tweakable)
    const margins = EditorConfig.dimensions[context].margins;
    // Number of points and series
    const pointCount = config.pointCount;
    let seriesCount = config.seriesCount;
    // If bars are stacked, that counts, for this function's purposes, as
    // a single trace:
    if (chartStyle === 'stacked') {
      seriesCount = 1;
    }
    // Hard-coded (for now) array of cluster-heights to use if bars are side-by-side.
    // Up to a maximum of four traces, sets cluster-height val. So if there's
    // just one trace, each bar is 8pts high; if there are 4 (or more) traces,
    // each cluster is 20px high...
    // *** NOTE: ANOTHER ITEM TO GO INTO A GENERAL PREFS FILE ***
    const depthsArray = [ 8, 14, 18, 20 ];
    // Gap height: NOTE: another one for the prefs file
    const gapHeight = 5;
    // We only calculate for up to 4 traces (ie, above 4, just squeeze)
    if (seriesCount > depthsArray.length) {
      seriesCount = depthsArray.length - 1;
    }
    // So: height of one cluster
    const clusterHeight = depthsArray[seriesCount - 1];
    // ...and height of all bars together
    let innerBoxHeight = clusterHeight * pointCount;
    // Adjust for overlapping
    // (I've lifted this straight from my old Excel code. Frankly,
    // I don't understand it any more...)
    // Firefox doesn't like 'includes', so:
    if (chartStyle.search('overlap') >= 0) {
      innerBoxHeight -= clusterHeight;
      innerBoxHeight -= ((clusterHeight / 2) * (seriesCount - 1));
    }
    // Now allow for gaps, and return...
    innerBoxHeight += (gapHeight * (pointCount - 1));
    // Add top and bottom margins, round up to nearest 5, and return:
    const returnedHeight = innerBoxHeight + margins.top + margins.bottom;
    return Math.ceil(returnedHeight / 5) * 5;
  }
  // GET BAR CHART HEIGHT ends

  // ====================================

  // UNPICK TSV
  // Converts tsv into an array of objects with 'category' and 'value' properties
  // *** CURRENT ASSUMPTION THAT THERE'S JUST ONE SERIES ***
  // Returns an object with properties:
  //  data: Array
  //  headers: Array
  //  longestCatString
  //  minVal
  //  maxVal
  //  pointCount
  //  seriesCount
  // isValid
  // validityMsg
  unpickTsv(tsv) {
    // Convert the TSV string to an array of organised data
    // Fcn returns an object with 3 properties: isValid flag,
    // any error message, and an array of data
    const dataObj = this.tsvToArray(tsv);
    const config = Object.assign({}, dataObj);
    if (!config.isValid) {
      return config;
    }
    // Still here? Data pans out...
    const data = dataObj.data;
    // Count rows and columns:
    let rLen = data.length;
    const cLen = data[0].length;
    // We have an array of arrays...
    // Do we have headers? If not, invent them:
    let headArray = [];
    // Original hard-check for 'category':
    // if (data[0][0] === 'category') {
    // Now look for string in data[0][1]
    if (isNaN(data[0][1])) {
      headArray = data.shift();
      rLen--;
    } else {
      headArray = [ 'category' ];
      for (let i = 1; i < cLen; i++) {
        // headArray.push(`value`);
        headArray.push(`value${i}`);
      }
    }
    // So headArray is an array of header strings
    // and data is an array of categories and values
    // Extract longest category string:
    const longestCat = this.getLongestCategoryString(data);
    // Init array to get min and max vals:
    const minmaxArray = [];
    // Now convert from raw data structure array/array to my array/object
    const dArray = [];
    // By row
    for (let rNo = 0; rNo < rLen; rNo++) {
      const thisRow = data[rNo];
      const tempObj = {};
      // Each element in the row becomes an object property
      // that gets its name from the headers
      for (let cNo = 0; cNo < cLen; cNo++) {
        const seriesName = headArray[cNo];
        let val = thisRow[cNo];
        tempObj[seriesName] = val;
        if (cNo > 0) {
          // val is a string: make it a number:
          val = this.valStrToNum(val);
          minmaxArray.push(val);
        }
      }
      dArray.push(tempObj);
    }
    // Min and max vals:
    const minVal = Math.min(...minmaxArray);
    const maxVal = Math.max(...minmaxArray);
    // Still here? All checked out. Return data (array of objects), actual
    // min/maxVal and array of headers, plus number of series (i.e. cols - 1)
    // and points (rows, without headers), and longest string found...
    // with reset validity flag (no need to reset validityMsg)
    config.data = dArray;
    config.minVal = minVal;
    config.maxVal = maxVal;
    config.headers = headArray;
    config.seriesCount = (cLen - 1);
    config.pointCount = rLen;
    config.longestCatString = longestCat;
    config.isValid = true;
    return config;
  }
  // UNPICK TSV ends

  // TSV TO ARRAY
  // Called from unpickTsv, converts the TSV string into
  // an array of data
  tsvToArray(tsv) {
    // The object to return will have properties: data, isValid, msg
    const dataObj = { isValid: true, validityMsg: '' };
    // Convert tsv to an array of strings (element=row)
    const data = tsv.split(/\r?\n/);
    // Count rows (headers + however many points):
    const rLen = data.length;
    // Minimum 2 rows:
    if (rLen < 2) {
      dataObj.isValid = false;
      dataObj.validityMsg = 'Data must consist of at least 2 rows: headers plus 1 item...';
      return dataObj;
    }
    // NOTE: further validity checks very possibly to come...
    // Still here? Turn each 'row' into an array:
    for (let rNo = 0; rNo < rLen; rNo++) {
      // First, check string length to trap empty rows:
      // NOTE: this might be simpler, however, as a mere item-length comparison
      // after the row has been split (about 5 lines down)...
      if (data[rNo].trim().length < 1) {
        dataObj.isValid = false;
        dataObj.validityMsg = `Row ${rNo + 1} of data is blank...`;
        return dataObj;
      }
      data[rNo] = data[rNo].split(/\t/);
      if (data[rNo].length < 2) {
        dataObj.isValid = false;
        dataObj.validityMsg = `Row ${rNo + 1} of data has only one column...`;
        return dataObj;
      }
    }
    dataObj.data = data;
    return dataObj;
  }
  // TSV TO ARRAY ends

  // GET LONGEST CAT STRING
  // Called from unpickTsv to return longest category string.
  // Param is data array.
  getLongestCategoryString(data) {
    let longestCat = '';
    let maxCatLen = 0;
    for (const iNo in data) {
      const cat = data[iNo][0];
      const catLen = cat.length;
      if (catLen > maxCatLen) {
        maxCatLen = catLen;
        longestCat = cat;
      }
    }
    return longestCat;
  }
  // GET LONGEST CAT STRING ends

  // VAL STR TO NUM
  // Called from unpickTsv. Converts val string tu number
  valStrToNum(val) {
    let num = parseInt(val, 10);
    if (val.search(/\./) > -1) {
      num = parseFloat(val);
    }
    return num;
  }
  // VAL STR TO NUM ends

  // MIN MAX OBJECT
  // Passed 3 args: actual min val; actual max val; ideal number of increment-steps
  // Returns obj with 4 properties: min, max, increment and an updated step-count
  getScaleMinMaxIncr(minVal, maxVal, stepNo) {
    const mmObj = {};
    // Array of "acceptable" increments
    const plausibleIncrs = this.props.operations.plausibleIncrements;
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
  // MIN MAX OBJECT ends

    // CATCH TAB EVENT
    // Called from render > textarea > keydown event to
    // pre-empt default tab-switches-focus and put a tab in data field
    catchTabEvent(event) {
      if (event.keyCode === 9) {
        // prevent the focus loss
        event.preventDefault();
        const target = event.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;
        const textBefore = value.substring(0, start);
        const textAfter = value.substring(end);
        // set textarea value to: text before caret + tab + text after caret
        target.value = `${textBefore}\t${textAfter}`;
        // put caret at right position again (add one for the tab)
        target.selectionStart = target.selectionEnd = start + 1;
      }
    }
    // CATCH TAB EVENT ends

    // CATCH COLUMN EVENT
    // Called for column-width dropdown to update
    // width input.
    catchColumnEvent(event) {
      const iii = event.target.selectedIndex;
      // NOTE: at present, the dropdown displays an empty first
      // item, which I need to ignore...
      if (iii > 0) {
        // NOTE: column widths are hard-coded into this component as props
        // NOTE: I need that lookup file!!
        const widthEl = this.editorForm.getEditor('root.dimensions.width');
        widthEl.setValue(this.props.widthsArray[iii - 1]);
      }
      // Leftovers from when I used literal string...
      // const colCount = parseInt(event.target.value.split(' '), 10) - 1;
      // const val = this.props.widthsArray[colCount];
      // const widthEl = this.editorForm.getEditor('root.dimensions.width');
      // widthEl.setValue(val);
    }
    // CATCH COLUMN EVENT ends

    catchBarSpanEvent(event) {
      // Get the value from the span...
      const val = parseFloat(event.target.textContent, 10);
      // ...and send to the input:
      const heightEl = this.editorForm.getEditor('root.dimensions.height');
      heightEl.setValue(val);
    }

  // RENDER is vestigial: just draw something for componentDidMount to target...
  render() {
    return (
      <div id="editorcomponent-div">
        <form id="json-editor"></form>
      </div>
    );
  }
}
