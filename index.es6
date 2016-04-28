// * global document */
import React from 'react';
// Tab bar component:
import SilverTabBar from '@economist/component-silver-tab-bar';
// The default config object, to be 'sharpened up' and passing down the tree...
import ConfigObject from './assets/new_default_config_object.json';
// Single preferences file
import Preferences from './assets/preferences.json';
// Utilities module
import * as EditorUtilities from './editorutilities';

// NOTE: the EDITOR is still very provisional and will remain so until
// I've sorted out all the structural issues and got all the options
// into the FORM.
// As of 10.2.16, we seem to be stateless. The only pseudo-globals are the
// context, subcontext and type strings, with are properties of ConfigObject

export default class SilverEditor extends React.Component {

  // PROP TYPES
  static get propTypes() {
    return {
      // Callback to Sibyl
      passUpdatedConfig: React.PropTypes.func.isRequired,
      folds: React.PropTypes.object,
    };
  }

  // DEFAULT PROPS
  static get defaultProps() {
    return {
      // NOTE: 'iden' must match specific fold selector in css
      folds: {
        data: { iden: 'data', display: 'Data', defaultText: 'Fold for data textarea',
          valid: false, open: true },
        layout: { iden: 'layout', display: 'Layout', defaultText: 'Chart type and section',
          valid: false, open: false },
        scales: { iden: 'scales', display: 'Scales', defaultText: 'Chart scales',
          valid: false, open: false },
      },
    };
  }

  // CONSTRUCTOR
  constructor(props) {
    super(props);
    this.state = {
      folds: props.folds,
    };
  }
  // CONSTRUCTOR ends

  // COMPONENT DID MOUNT
  componentDidMount() {
    console.log(Preferences);
    return;
  }
  // COMPONENT DID MOUNT ends

  // SET DYNAMIC SCHEMA VALUES
  // Currently called from:
  //    componentDidMount after initial render
  //    *******, when user selects new context on tabs
  //    catchTextAreaPasteEvent, when user pastes new data into the textarea
  // Sets dynamic values in the schema
  // NOTE: currently assumes that properties are available in state...
  setDynamicSchemaVals() {
    // Current context and widths array:
    const context = ConfigObject.metadata.context;
    const subContext = ConfigObject.metadata.subcontext;
    const contextNode = Preferences.contexts[context];
    const widthsArray = contextNode.editor.subcontexts;
    // Bale out now. I assume that when I update the EditorSchema
    // that provokes a 'change' event, and we're off...
    return;
    // NOTE: I don't think we need this any more:
    if (typeof this.editorForm !== 'undefined') {
      // Strings: title, subtitle, source, footnote
      const eSource = EditorSchema.properties.strings.properties;
      this.editorForm.getEditor('root.strings.title').setValue(eSource.title.default);
      this.editorForm.getEditor('root.strings.subtitle').setValue(eSource.subtitle.default);
      this.editorForm.getEditor('root.strings.source').setValue(eSource.source.default);
      this.editorForm.getEditor('root.strings.footnote').setValue(eSource.footnote.default);
      // Width
      const val = widthsArray[subContext];
      this.editorForm.getEditor('root.dimensions.width').setValue(val);
    } else {
      // NOTE: this should never run, but keep a check on it for now...
      console.log('I should not be hitting this point in Editor.setDynamicSchemaVals...');
    }
  }
  // SET DYNAMIC SCHEMA VALUES ends

  // GET BAR CHART INNER-BOX HEIGHT
  // Called from componentDidMount; param is the validated config object.
  // (A) If this is a bar chart, calls getBarChartHeight to calculate innerbox height
  // and consequent overall chart height, which it displays as the recommended chart outer
  // height (based on number of bars)...
  // NOTE: I'll have to catch stacked and overlapping bars eventually...
  // (B) For other styles, it would *probably* (remains to be decided) just derive
  // innerbox height from overall height...
  // In either case, returns innerbox height
  getChartInnerboxHeight(config) {
    // NOTE: chart style hard-coded here for now. Eventually get style from editorForm...
    const style = 'bars';
    const hDescrip = this.editorForm.getEditor('root.dimensions.height').description;
    if (style === 'bars') {
      const heightObj = this.getBarChartHeight(config);
      hDescrip.innerHTML = `Recommended height: <span>${heightObj.outerHeight}pts</span>. Click to use...`;
      // Reset event on span:
      const barRecommendSpan = document.querySelectorAll('.form-control p span')[0];
      barRecommendSpan.onclick = this.catchBarSpanEvent.bind(this);
      innerHeight = heightObj.innerHeight;
    } else {
      hDescrip.innerHTML = '';
      // eventually return something...
    }
    return innerHeight;
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
    const context = ConfigObject.context;
    const subContext = ConfigObject.subcontext;
    const style = ConfigObject.style;
    config.context = context;
    config.subContext = subContext;
    config.style = style;
    // Context and style nodes:
    const contextNode = EditorConfig.contexts[context];
    const styleNode = contextNode.style_specific[style];
    // Get gap from specific config node and pass it down...
    config.gap = styleNode.gap;
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
    const ticks = contextNode.general.ticks;
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
  // UNPICK CONFIG ends

  // PASS CONFIG TO SIBYL
  // Simply lobs the config object back up the tree
  passConfigToSibyl(config) {
    // NOTE: Since there's no 'other' component,
    // hard-set context to 'print'... This hard-coding
    // has no structural implications and can be deleted
    // as soon as we have other contexts in play...
    // console.log(config);
    config.context = 'print';
    this.props.passUpdatedConfig(config);
    // NOTE: testing here...
    this.editorForm.schema = this.schemaObj;
  }
  // PASS CONFIG TO SIBYL ends

  // GET BAR CHART HEIGHT
  // Some styles -- well, bar charts, anyway -- force the chart height
  // Param is the validated config object
  getBarChartHeight(config) {
    const context = ConfigObject.context;
    // NOTE: currently, Editor doesn't care about sub-context...
    // const subContext = ConfigObject.subcontext;
    const style = ConfigObject.style;
    const contextNode = EditorConfig.contexts[context];
    const styleNode = contextNode.style_specific[style];
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
    const clusterHeights = styleNode.clusterHeights;
    const gapHeight = styleNode.gap;
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
    // Return an object with inner and outer heights...
    return {
      innerHeight: innerBoxHeight,
      outerHeight: Math.ceil(returnedHeight / 5) * 5,
    };
  }
  // .innerHeight and .outerHeight
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

  // CATCH TEXT AREA PASTE EVENT
  // Listener for paste into data textarea
  catchTextAreaPasteEvent() {
    console.log('Running text area paste-in listener, although I cannot remember what it is supposed to do...');
    this.setDynamicSchemaVals();
  }
  // CATCH TEXT AREA PASTE EVENT ends

  // CATCH BAR SPAN EVENT
  // Listener to the 'recommended height' button
  catchBarSpanEvent(event) {
    // Get the value from the span...
    const val = parseFloat(event.target.textContent, 10);
    // ...and send to the input:
    const heightEl = this.editorForm.getEditor('root.dimensions.height');
    heightEl.setValue(val);
  }
  // CATCH BAR SPAN EVENT ends

  // FIELD CONTEXT FROM TAB BAR
  // Callback sent to the TabBar. Param is an object
  // with 2 props: parent (string)...
  // ...and children (array, possible empty, and currently redundant)
  fieldContextFromTabBar(obj) {
    // Reset reference object:
    ConfigObject.metadata.context = obj.parent;
    ConfigObject.metadata.subcontext = obj.child;
    // NOTE: comm'd out call that kicks off chart draw...
    // this.setDynamicSchemaVals();
    console.log(ConfigObject)
  }
  // FIELD CONTEXT FROM TAB BAR ends

    // UNPICK CONTEXTS
    // Called from getTabBarJSX to assemble the context definitions to pass
    // down to the TabBar component
    unpickContexts() {
      // Get default context and all context nodes from lookup:
      const defaultContext = Preferences.metadata.defaults.context;
      const contexts = Preferences.contexts;
      // Result will be an array of context definitions
      const result = [];
      // Loop by context objects:
      Object.keys(contexts).forEach((key) => {
        // Exclude my comments (this needs to be deleted... or something... eventually)
        if (key.search('SECTION') < 0) {
          // We're looking for an 'editor' subnode
          const obj = contexts[key].editor;
          // Init obj to return with context name
          // (All lower case; tab bar does uppercasing)
          const tempObj = { parent: key };
          // Subcontexts list:
          const children = [];
          Object.keys(obj.subcontexts).forEach((val) => {
            children.push(val);
          });
          // So we have an array of child names.
          // ( Contexts with no subcontext: children = ['default'] )
          tempObj.children = children;
          // Flag for default hightlight on tab bar
          tempObj.default = (key === defaultContext);
          result.push(tempObj);
        }
      });
      return result;
    }
    // UNPICK CONTEXTS ends

    // CATCH RESET CLICK
    catchResetClick() {
      // Empty text area
      // Set strings back to default
      // Set width and height back to default...
    }

  // GET TAB BAR JSX
  // Called from render to assemble the context options tab bar
  // NOTE: I'm wrapping the tab bar in a 'header' div. This is
  // in case I decide to add any other content...
  getTabBarJsx() {
    const unpickedContexts = this.unpickContexts();
    return (
      <div className="editor-header-wrapper">
         <div className="chart-context-choices-div">
          <SilverTabBar
            tabBarDefinitions={unpickedContexts}
            passContextToEditor={this.fieldContextFromTabBar.bind(this)}
          />
        </div>
        <div className="chart-reset-wrapper">
          <div className="silverbullet-reset-button" id="silverbullet-reset-button">
            <p onClick={this.catchResetClick.bind(this)}>Reset</p>
          </div>
        </div>
      </div>
    );
  }
  // GET TAB BAR JSX ends


  catchTypeChange(evt) {
    ConfigObject.metadata.type = evt.target.value;
  }

  catchSectionChange(evt) {
    ConfigObject.metadata.section = evt.target.value;
  }

  // GET SECTION SELECT
  // Assembles style dropdown
  getSectionSelect() {
    const sectionArray = Preferences.metadata.sections;
    const options = sectionArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    const defaultValue = Preferences.metadata.defaults.section;
    return (
      <select className="editor-section-select" defaultValue={defaultValue}
        onChange={this.catchSectionChange.bind(this)}
      >
        {options}
      </select>
    );
  }
  // GET SECTION SELECT ends

  // GET TYPE SELECT
  // Assembles style dropdown
  getTypeSelect() {
    const typeArray = Preferences.metadata.types;
    const options = typeArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    const defaultValue = Preferences.metadata.defaults.type;
    return (
      <select className="editor-type-select" defaultValue={defaultValue}
        onChange={this.catchTypeChange.bind(this)}
      >
        {options}
      </select>
    );
  }
  // GET TYPE SELECT ends

  catchEditorFormChange(evt) {
    console.log(evt);
  }

  // GET FORM JSX
  // Called from render to assemble the editor form...
  getFormJsx() {
    // Section dropdown
    const sectionSelect = this.getSectionSelect();
    // Chart type dropdown
    const typeSelect = this.getTypeSelect();
    // To come:
    //  panels
    //  ...and all the rest of it...
    return (
      <form id="json-editor"
        onChange={this.catchEditorFormChange.bind(this)}
      >
        {sectionSelect}
        {typeSelect}
      </form>
    );
  }
  // GET FORM JSX ends

  // MAKE FOLD JSX
  // Builds accordian 'fold' (LI) and contents
  // Arg is a string referring to an element defined, above, in props.folds
  makeFoldJsx(fName) {
    const propFold = this.props.folds[fName];
    const stateFold = this.state.folds[fName];
    // The 'open' fold has a height determined by a toggled class
    let liClass = '';
    if (stateFold.open) {
      liClass = `${fName}-fold`;
    }
    const headClass = `${fName}-fold-head`;
    const bDisplay = propFold.display;
    const defText = propFold.defaultText;
    /* Structure is:
        li
          header div
            button div
            span
          body div
    */
    return (
      <li className={liClass} key={fName}>
        <div className={headClass}>
          <div onClick={this.catchFoldButtonClick.bind(this)}>{bDisplay}</div>
          <span className="data-fold-head-span">{defText}</span>
        </div>
        <div className="data-fold-body">{`Body of ${fName}`}</div>
      </li>
    );
  }
  // MAKE FOLD JSX ends

  // CATCH FOLD BUTTON CLICK
  // Event-catcher for click on accordian fold-open button
  // Resets state with updated fold open/close flab
  catchFoldButtonClick(evt) {
    const folds = this.state.folds;
    const thisKey = evt.target.innerHTML.toLowerCase();
    const thisFold = folds[thisKey];
    console.log(thisKey);
    // I'm only interested in opening folds
    if (thisFold.open) {
      console.log('Already open, thanks');
      return;
    }
    // Still here: I want to open a closed fold...
    for (const key in folds) {
      folds[key].open = (key === thisKey);
    }
    this.setState({ folds });
  }
  // CATCH FOLD BUTTON CLICK ends

  // RENDER
  // editorHeaderStructure is currently the context tab bar
  // remainder is the json-editor form
  render() {
    // NOTE: General form structure used this:
    // let formJsx = this.getFormJsx();
    // ...which I've copied to the utilities module for safe-keeping
    // Now attempting accordion structure...
    // NOTE: I could derive 'folds' from props definitions, but sooner
    // or later I hit inferential fun, so let's keep it crude and simple...
    // ...at least we can see what we're throwing around:
    const dataFoldJsx = this.makeFoldJsx('data');
    const layoutFoldJsx = this.makeFoldJsx('layout');
    const scalesFoldJsx = this.makeFoldJsx('scales');
    // Tab bar (dependent component) at top of chart div, for context choices:
    const tabBarJsx = this.getTabBarJsx();
    return (
      <div className="silverbullet-editor-wrapper">
        <div className="editor-form-outer-wrapper">
          <ul className="editor-form-accordion">
            {dataFoldJsx}
            {layoutFoldJsx}
            {scalesFoldJsx}
          </ul>
        </div>
        {tabBarJsx}
      </div>
    );
  }
}
