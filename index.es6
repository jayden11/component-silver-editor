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
        this.returnConfig(this.editorForm);
      } else {
        console.log('Invalid data...');
      }
    });
  }
  // COMPONENT DID MOUNT ends

  // VALIDATE FORM
  // Actually, I can't really separate validation of the raw data,
  // at least, from unpicking. But for now, anyway...
  validateForm(eForm) {
    // First, run JSONEditor's validation. This is fairly basic: concerned
    // with value types (string, interger) and lengths (min/max)
    const errors = eForm.validate();
    if (errors.length > 0) {
      console.log(`Oops! Found ${errors.length} errors...`);
      return false;
    }
    // Get actual values:
    const editorVals = eForm.getValue();
    // NOTE: now -- to come -- set up specific integrity checks
    // on things like incr = exact divisor of (max - min)
    //
    // For now: just a crude check that there IS data:
    if (editorVals.data.length < 1) {
      return false;
    }
    // ...and eventually, if we're still here...
    return true;
  }
  // VALIDATE FORM ends

  // RETURN CONFIG
  // Reshape form values to suit SilverBullet, then pass back...
  returnConfig(eForm) {
    // Get actual values:
    const editorVals = eForm.getValue();
    // Find out what we can from the data
    // (data, headers, min/max/incr, point/seriesCount, longestCatString)
    const dataObj = this.unpickTsv(editorVals.data);
    // ...which yields an object with various values that we need.
    // So pack them into a config object...
    const config = {};
    // For now, hard-code in context and style properties:
    config.context = 'print';
    config.style = 'bars';
    // Data:
    config.data = dataObj.data;
    // Min/max/increment:
    // *** Careful: HARD-WIRED TO SINGLE-SCALE AT PRESENT.
    // *** Will need to work with 2 scales on scatter charts, eventually...
    // AND PROBABLY IN THE WRONG PLACE -- MOVES DOWN TO ChartWrapper, or something...
    const mmiObj = this.getScaleMinMaxIncr(0, dataObj.maxVal, this.props.operations.ticks);
    // Unpick:
    config.minmax = mmiObj;
    // Next comm'd out... I think because tick count is size-related...
    // NOTE: but watch out, now we can tweak chart width...
    // config.ticks = mmiObj.ticks;
    // Do I have to force the chart height (eg bar chart)...?
    // Get context-specific margins
    const margins = EditorConfig.dimensions[config.context].margins;
    const forcedHeight = this.barChartForcedHeight(dataObj, margins);
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
    dimObj.outerbox.height = forcedHeight;  // editorVals.dimensions.height;
    config.dimensions = dimObj;
    // Headers (yes: we need these for D3 colour mapping)
    config.headers = dataObj.headers;
    this.props.passUpdatedConfig(config);
  }
  // RETURN CONFIG ends

  // GET FORCED HEIGHT
  // Some styles -- well, bar charts, anyway -- force the chart height
  // Param is formEditor.getValues
  barChartForcedHeight(eConfig, margins) {
    const pointCount = eConfig.pointCount;
    // For now:
    const height = margins.top + margins.bottom + (pointCount * 10);
    return height;
  }


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
  unpickTsv(tsv) {
    // Max val, longest cat string, and data array to return:
    let maxVal = 0;
    let maxCatLen = 0;
    let longestCat = '.';
    const dArray = [];
    // Convert string to an array (by rows)
    const data = tsv.split(/\r?\n/);
    // Count rows (points):
    let rLen = data.length;
    // Now turn each 'row' into an array:
    for (let rNo = 0; rNo < rLen; rNo++) {
      data[rNo] = data[rNo].split(/\t/);
    }
    // Count columns:
    const cLen = data[0].length;
    // So now we have an array of arrays...
    // Do we have headers? If not, invent them:
    // (*** more to do here: can't stay locked to category/value ***)
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
    // Now convert from raw data structure array/array to my array/object
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
          // val is a string: parseFloat/Int acc'g to dec...
          if (val.search(/\./) > -1) {
            val = parseFloat(val);
          } else {
            val = parseInt(val, 10);
          }
          if (val > maxVal) {
            maxVal = val;
          }
        } else {
          // Finding longest category string...
          const catLen = val.length;
          if (catLen > maxCatLen) {
            maxCatLen = catLen;
            longestCat = val;
          }
        }
      }
      dArray.push(tempObj);
    }
    // Return data (array of objects), maxVal and array of headers, plus
    // number of series (i.e. cols - 1) and points (rows, without headers),
    // and longest string found...
    return {
      data: dArray,
      maxVal,
      headers: headArray,
      seriesCount: (cLen - 1),
      pointCount: rLen,
      longestCatString: longestCat,
    };
  }
  // UNPICK TSV ends


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

    // CATCH TAB DOWN EVENT
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

  // RENDER is vestigial: just draw something for componentDidMount to target...
  render() {
    return (
      <div id="editorcomponent-div">
        <form id="json-editor"></form>
      </div>
    );
  }
}
