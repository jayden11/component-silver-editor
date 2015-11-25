import React from 'react';
import EditorSchema from './assets/editorschema.json';
// import EditorConfig from './assets/editorconfig.json';
// * global document */

export default class SilverEditor extends React.Component {

  static get propTypes() {
    return {
      operations: React.PropTypes.object.isRequired,
      passUpdatedConfig: React.PropTypes.func.isRequired,
    };
  }

  // DEFAULT PROPS
  // default operations props here for now:
  static get defaultProps() {
    // return {
    //   operations: {
    //     ticks: 5,
    //     plausibleIncrements: [ 0.25, 0.5, 1, 2, 3, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000 ],
    //   },
    // };
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
    const editorForm = new JSONEditor(document.getElementById('json-editor'), schemaObj);
    // Intercept tabs in raw data text area, to prevent default focus-shift...
    const textarea = document.querySelectorAll('.form-control textarea')[0];
    textarea.onkeypress = this.catchTabEvent.bind(this);
    //    NOTE: I can use next to overwrite schema 'default' values with a
    //    simple set of element/value properties. However, the 'editorconfig.json'
    //    file that I assembled doesn't currently match structure. This needs
    //    thinking through...
    // editorForm.setValue(this.props.config);
    editorForm.on('change', () => {
      if (this.validateForm(editorForm)) {
        this.returnConfig(editorForm);
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
    console.log(`${errors.length} errors...`);
    if (errors.length > 0) {
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
    const dataObj = this.unpickTsv(editorVals.data);
    // ...which yields an object with various values that we need.
    // So pack them into a config object...
    const config = {};
    config.data = dataObj.data;
    // Min/max/increment:
    // *** Careful: HARD-WIRED TO SINGLE-SCALE AT PRESENT.
    // *** Will need to work with 2 scales on scatter charts, eventually...
    // AND PROBABLY IN THE WRONG PLACE -- MOVES DOWN TO ChartWrapper, or something...
    const mmiObj = this.getScaleMinMaxIncr(0, dataObj.maxVal, this.props.operations.ticks);
    // Unpick:
    config.minmax = mmiObj;
    // config.ticks = mmiObj.ticks;
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
    // For now, hard-code in other properties:
    config.context = 'print';
    config.style = 'bars';
    config.dimensions = { 'outerbox': { 'width': 160, 'height': 155 } };
    this.props.passUpdatedConfig(config);
  }
  // RETURN CONFIG ends


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
    if (data[0][0] === 'category') {
      headArray = data.shift();
      rLen--;
    } else {
      headArray = [ 'category' ];
      for (let i = 1; i < cLen; i++) {
        // headArray.push(`value${i}`);
        headArray.push(`value`);
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
          // val is a string, so...
          if (val.search('.') > -1) {
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
        // prevent the focus lose
        event.preventDefault();
      }
    }
    // CATCH TAB EVENT ends


  // RENDER is vestigial: just draw something for componentDidMount to target...
  render() {
    return (
      <div id="editorcomponent-div">
        <form id="json-editor"></form>
      </div>
    );
  }
}
