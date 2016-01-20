// * global document */
import React from 'react';
// The json schema:
import EditorSchema from './assets/editor_schema.json';
// Properties necessary for user-interaction with the Editor
import EditorConfig from './assets/editor_config.json';
// The default config object, to be 'sharpened up' and passing down the tree...
import ConfigObject from './assets/default_config_object.json';

// NOTE: the EDITOR is still very provisional and will remain so until
// I've sorted out all the structural issues and got all the options
// into the FORM.
// Latest update, 19.1.16 did:
//    - lookup files restructured (see above)
//    - current context/style node is in state... but is that right??
// Do I want to re-render if I change values in the FORM...?

export default class SilverEditor extends React.Component {

  // PROP TYPES
  static get propTypes() {
    return {
      passUpdatedConfig: React.PropTypes.func.isRequired,
      contextString: React.PropTypes.string,
    };
  }

  // DEFAULT PROPS
  static get defaultProps() {
    return {};
  }

  // CONSTRUCTOR
  // This is premature, I think. But set the context/style lookup object
  // as state. Eventually, as user sets context and style on the Form,
  // state will update...?
  constructor(props) {
    super(props);
    const specificContext = EditorConfig.contexts[props.contextString];
    const specificStyle = specificContext.style_specific.bars;
    this.state = { specificContext, specificStyle };
  }
  // CONSTRUCTOR ends

  // COMPONENT DID MOUNT
  componentDidMount() {
    /* eslint-disable id-match */
    /* eslint-disable no-undef */
    /* eslint-disable no-console */
    /* eslint-disable camelcase */
    this.schemaObj = {};
    this.schemaObj.schema = EditorSchema;
    // 2 options disable unwanted user access:
    this.schemaObj.disable_edit_json = true;
    this.schemaObj.disable_properties = true;
    // Initialise editor form:
    this.editorForm = new JSONEditor(document.getElementById('json-editor'), this.schemaObj);
    // Remove the root 'Collapse' button:
    this.editorForm.getEditor('root').toggle_button.remove();
    // NOTE: At present I set up column width dropdown items in 2 places,
    // the schema and the operations lookup. Can I combine them -- ideally,
    // refer only to operations...?
    this.setDynamicSchemaVals();
    // Intercept tabs in raw data text area, to prevent default focus-shift...
    const textarea = document.querySelectorAll('.form-control textarea')[0];
    textarea.onkeydown = this.catchTabEvent.bind(this);
    // Intercept column-count change:
    const columnDropDown = document.querySelectorAll('.form-control select')[0];
    columnDropDown.onchange = this.catchColumnEvent.bind(this);
    // When editorForm changes, check and dispatch the config obj to Sibyl
    // (N.B.: changing dropdown selection doesnt't register as an event; it's only
    // when a field changes consequently that 'change' is tripped...)
    this.editorForm.on('change', () => {
      if (this.validateForm(this.editorForm)) {
        // Do the TSV-to-Json conversion and check the validity of the data
        const unpickedConfig = this.unpickConfig(this.editorForm);
        // Check the config object's 'isValid' flag:
        if (unpickedConfig.isValid) {
          // Data has passed both validity checks.
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

  componentWillReceiveProps(newProps) {
    const newStr = newProps.contextString;
    const oldStr = this.props.contextString;
    if (newStr !== oldStr) {
      const specificContext = EditorConfig.contexts[newStr];
      // NOTE: hard-coding to bars here
      const specificStyle = specificContext.style_specific.bars;
      console.log('Changing state...');
      this.state = { specificContext, specificStyle };
      this.setDynamicSchemaVals();
    }
  }

  // SET DYNAMIC SCHEMA VALUES
  // Currently called from componentDidMount only, but may (will?)
  // be called from other functions. Sets dynamic values in the schema
  // NOTE: currently assumes that properties are available in state...
  setDynamicSchemaVals() {
    // Widths:
    const widthSource = this.state.specificContext.general.widths;
    const wArray = Object.keys(widthSource);
    if (typeof this.editorForm !== 'undefined') {
      // Let's do this the hard way, by digging down to the innerHTML
      // Assemble the string:
      // "<option value="One">One</option><option value="Two">Two</option>"
      let ddStr = '';
      for (let i = 0; i < wArray.length; i++) {
        const str = wArray[i];
        ddStr += `<option value="${str}">${str}</option>`;
      }
      const ddEl = this.editorForm.getEditor('root.dimensions.columns').control.children[1];
      ddEl.innerHTML = ddStr;
      // By default, re-populated dropdown displays first item string
      // Reset the width field with matching value
      // (Editor registers this as change event and fires off updated config to Sibyl...)
      const val = this.state.specificContext.general.widths[wArray[0]];
      this.editorForm.getEditor('root.dimensions.width').setValue(val);
    } else {
      // NOTE: this should never run, but keep a check on it for now...
      console.log('I should not be hitting this point in Editor.setDynamicSchemaVals...');
      // this.schemaObj.schema.properties.dimensions.properties.columns.enum = wArray;
    }
  }
  // SET DYNAMIC SCHEMA VALUES ends

  // SHOW BAR HEIGHT RECOMMENDATION
  // Called from componentDidMount. Passed the validated config object,
  // if this is a bar chart, calculates and displays the recommended
  // height based on number of bars...
  // NOTE: I'll have to catch stacked and overlapping bars eventually...
  showBarHeightRecommendation(config) {
    // NOTE: chart style hard-coded here for now. Eventually get style from editorForm...
    const style = 'bars';
    const hDescrip = this.editorForm.getEditor('root.dimensions.height').description;
    if (style === 'bars') {
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
  // RETURN CONFIG ends

  // PASS CONFIG TO SIBYL
  // Simply lobs the config object back up the tree
  passConfigToSibyl(config) {
    // NOTE: Since there's no 'other' component,
    // hard-set context to 'print'...
    config.context = 'print';
    this.props.passUpdatedConfig(config);
  }
  // PASS CONFIG TO SIBYL ends

  // GET BAR CHART HEIGHT
  // Some styles -- well, bar charts, anyway -- force the chart height
  // Param is the validated config object
  getBarChartHeight(config) {
    // NOTE: hard-coded to print for now. But context and style are already
    // hard-coded into unpickConfig; and I eventually want to:
    //    - move defaults into the schema (when there's options to play with)
    //    - fetch it from there (or from the config obj?)
    const context = this.props.contextString;
    // Stacked?
    // NOTE: hard-coded for now...
    const isStacked = false;
    // Get default margins (not user-tweakable)
    const margins = ConfigObject.dimensions[context].margins;
    // Number of points and series
    const pointCount = config.pointCount;
    let seriesCount = config.seriesCount;
    // If bars are stacked, that counts, for this function's purposes, as
    // a single trace:
    if (isStacked) {
      seriesCount = 1;
    }
    // Array of cluster-heights to use if bars are side-by-side,
    // up to a max of four series (squeeze after that). And gap height.
    // NOTE: more hard-coding...
    const clusterHeights = this.state.specificStyle.clusterHeights;
    const gapHeight = this.state.specificStyle.gap;
    if (seriesCount > clusterHeights.length) {
      seriesCount = clusterHeights.length - 1;
    }
    // So: height of one cluster
    const clusterHeight = clusterHeights[seriesCount - 1];
    // ...and height of all bars together
    let innerBoxHeight = clusterHeight * pointCount;
    // NOTE: this is adapted from my old Excel code, which also allowed for
    // overlapping bars. However, we've never used them, so go with a flag:
    // isStacked (false = bars side by side).
    // Code just below, comm'd out, is close to the Excel original. Left
    // here for possible reference...
    // Firefox doesn't like 'includes', so:
    /*
    if (chartStyle.search('overlap') >= 0) {
      innerBoxHeight -= clusterHeight;
      innerBoxHeight -= ((clusterHeight / 2) * (seriesCount - 1));
    }
    */
    // OK: back on track after that diversion. Now allow for gaps, and return...
    // innerBoxHeight += (gapHeight * (pointCount - 1));
    // NOTE: previous line assumed no outer padding. But I'm currently
    // going with outerpadding = innerpadding/2... So:
    innerBoxHeight += (gapHeight * (pointCount));
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
  // NOTE: list is probably incomplete...
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
    // Ideally user will enter a row of headers. But if not, we generate
    // crude default headers: ['category', 'value1', 'value2', etc]
    // Look for string in data[0][1]:
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
      // Row total for min/max calculation:
      const rowValTotal = this.getRowValTotal(thisRow);
      minmaxArray.push(rowValTotal);
      const tempObj = {};
      // Each element in the row becomes an object property
      // that gets its name from the headers
      for (let cNo = 0; cNo < cLen; cNo++) {
        const seriesName = headArray[cNo];
        tempObj[seriesName] = thisRow[cNo];
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

  // GET ROW VAL TOTAL
  // Called from unpickTSV to add up vals in a data row...
  // (ES6 array.reduce creates its own problems here, so going
  // with cheap and cheerful)
  // NOTE: I'll have to reconsider this if we're to allow opposing bar charts...
  getRowValTotal(rArray) {
    // Incoming array has 2 issues:
    //    item 0 is date/cat, so omit...
    //    subsequent items are strings, so force to numbers...
    let total = 0;
    for (let iii = 1; iii < rArray.length; iii++) {
      total += Number(rArray[iii]);
    }
    return total;
  }
  // GET ROW VAL TOTAL ends

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
    // How many 'columns' do we have? Let's assume that top row is the standard
    const colStandard = data[0].split(/\t/).length;
    // Min 2 cols:
    if (colStandard < 2) {
      dataObj.isValid = false;
      dataObj.validityMsg = `Data requires categories and at least 1 series of values...`;
      return dataObj;
    }
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
      const cLen = data[rNo].length;
      // Check for inconsistent column count (missing/excess tabs)
      if (cLen !== colStandard) {
        dataObj.isValid = false;
        dataObj.validityMsg = `Row ${rNo + 1} of data is invalid: too few or too many columns...`;
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
        // set textarea value to: text before cursor + tab + text after cursor
        target.value = `${textBefore}\t${textAfter}`;
        // put cursor at right position again (add one for the tab)
        target.selectionStart = target.selectionEnd = start + 1;
      }
    }
    // CATCH TAB EVENT ends

    // CATCH COLUMN EVENT
    // Called from column-width dropdown to update width.
    catchColumnEvent(event) {
      const str = event.target.value;
      console.log(str);
      // NOTE: HARD-CODED TO PRINT. Needs sorting so that it gets
      // the relevant node of the lookup file...
      // NOTE: context string now passed in as prop from Sibyl. What ensues...?
      const val = this.state.specificContext.general.widths[str];
      if (typeof val !== 'undefined') {
        const widthEl = this.editorForm.getEditor('root.dimensions.width');
        widthEl.setValue(val);
      }
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
