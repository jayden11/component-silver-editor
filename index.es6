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

export default class SilverEditor extends React.Component {

  // PROP TYPES
  static get propTypes() {
    return {
      // Callback to Sibyl
      passUpdatedConfig: React.PropTypes.func.isRequired,
      // Default fold definitions, which it seems reasonable to keep here...
      folds: React.PropTypes.object,
    };
  }

  // DEFAULT PROPS
  static get defaultProps() {
    return {
      // NOTE: 'iden' must match specific fold selector in css
      folds: {
        data: { iden: 'data', display: 'Data', defaultText: 'Fold for data textarea',
          valid: false, open: false },
        layout: { iden: 'layout', display: 'Layout', defaultText: 'Chart type, section and structure',
          valid: false, open: true },
        scales: { iden: 'scales', display: 'Scales', defaultText: 'Chart scales',
          valid: false, open: false },
      },
    };
  }

  // CONSTRUCTOR
  // 'folds' definitions object is in state, for accordion un/folding
  constructor(props) {
    super(props);
    this.state = {
      folds: props.folds,
    };
  }
  // CONSTRUCTOR ends

  // COMPONENT DID MOUNT
  componentDidMount() {
    console.log(ConfigObject);
  }
  // COMPONENT DID MOUNT ends

  // SET DYNAMIC SCHEMA VALUES: in utilities
  // GET CHART INNER-BOX HEIGHT: in utilities
  // GET BAR CHART HEIGHT: in utilities

  validateConfigObject() {
    console.log(ConfigObject.metadata);
    return true;
  }

  // FIELD UPDATED CONFIG OBJECT
  // Called from ALL form elements' event listeners...
  // ...if value is valid. Individual listeners have
  // updated the CO. In theory it is valid, but I may want
  // to do subsequent checks before tossing it up to Sibyl
  fieldUpdatedConfigObject() {
    if  (this.validateConfigObject()) {
      const config = {...ConfigObject};
      this.props.passUpdatedConfig(config);
    }
  }


  // UNPICK CONFIG
  // Reshape form values to suit SilverBullet, then pass back...
  unpickConfig(eForm) {
    // Get actual values:
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
    console.log(ConfigObject);
  }
  // FIELD CONTEXT FROM TAB BAR ends

    // UNPICK CONTEXTS
    // Called from getTabBarJSX to assemble the context definitions to pass
    // down to the TabBar component
    unpickContexts() {
      // Get default context and all context nodes from lookup:
      const defaultContext = Preferences.metadata.defaults.context;
      const defaultSubContext = Preferences.metadata.defaults.subcontext;
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
      // Update CO with default values:
      ConfigObject.metadata.context = defaultContext;
      ConfigObject.metadata.subcontext = defaultSubContext;
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


// CATCH TYPE CHANGE
// Listener to change event on chart Type dropdown
catchTypeChange(evt) {
  ConfigObject.metadata.type = evt.target.value;
  this.fieldUpdatedConfigObject();
}

  // CATCH SECTION CHANGE
  // Listener to change event on Section dropdown
  catchSectionChange(evt) {
    ConfigObject.metadata.section = evt.target.value;
    this.fieldUpdatedConfigObject();
  }
  // CATCH SECTION CHANGE ends

  // CATCH PANEL CHANGE
  catchPanelChange(evt) {
    // Extract panel property from input id
    const targ = evt.target;
    const targetId = targ.id.split('-')[1];
    const newVal = targ.value;
    const oldVal = ConfigObject.metadata.panels[targetId];
    // Validate...
    if (this.validPanelProps(targetId, newVal)) {
      // If targ is 'total' input, reset max on others:
      if (targetId === 'total') {
        this.refs.number.max = newVal;
        this.refs.rows.max = newVal;
        ConfigObject.metadata.panels[targetId] = newVal;
        this.fieldUpdatedConfigObject();
      }
    } else {
      // Ideally there'd be some sort of alert...
      targ.value = oldVal;
    }
  }
  // CATCH PANEL CHANGE ends

  validPanelProps(targetId, val) {
    // Take a copy of the current panel properties and
    // substitute potential new value
    const panels = {...ConfigObject.metadata.panels};
    for (const key in panels) {
      if (key === targetId) {
        panels[targetId] = val;
      }
    }
    // Check validity
    if (panels.number > panels.total) {
      return false;
    }
    if (panels.total % panels.rows !== 0) {
      return false;
    }
    if (panels.rows > panels.total) {
      return false;
    }
    return true;
  }

  // GET SECTION SELECT
  // Assembles style dropdown
  getSectionSelect() {
    const sectionArray = Preferences.metadata.sections;
    const options = sectionArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    const defaultValue = Preferences.metadata.defaults.section;
    // Update the config object:
    ConfigObject.metadata.section = defaultValue;
    return (
      <p>
        <label className="accordion-label"
          htmlFor="accordion-section-select"
        >
          Section
        </label>
        <select className="accordion-select"
          id="accordion-section-select"
          defaultValue={defaultValue}
          onChange={this.catchSectionChange.bind(this)}
        >
          {options}
        </select>
      </p>
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
    // Update the config object:
    ConfigObject.metadata.type = defaultValue;
    return (
      <p>
        <label className="accordion-label"
          htmlFor="accordion-type-select"
        >
          Chart type
        </label>
        <select className="accordion-select"
          id="accordion-type-select"
          defaultValue={defaultValue}
          onChange={this.catchTypeChange.bind(this)}
        >
          {options}
        </select>
      </p>
    );
  }
  // GET TYPE SELECT ends

  // GET PANEL INPUTS
  // Constructs contents of the Panels fieldset
  getPanelInputs() {
    // Get defaults from prefs
    const panelDefaults = Preferences.metadata.defaults.panels;
    // Update pass to config object
    ConfigObject.metadata.panels = panelDefaults;
    return (
      <fieldset className="accordion-layout-panel-fieldset">
        <legend>Panels</legend>
        <p>
        <label htmlFor="panel-number-input">number:</label>
        <input
          type="number" id="panel-number-input"
          defaultValue={panelDefaults.number}
          min="1" max={panelDefaults.total} ref="number"
          onBlur={this.catchPanelChange.bind(this)}
          required
        ></input>
        </p>
        <p>
        <label htmlFor="panel-total-input">of total:</label>
        <input
          type="number" id="panel-total-input"
          defaultValue={panelDefaults.total}
          min="1" max="8" ref="total"
          onBlur={this.catchPanelChange.bind(this)}
          required
        ></input>
        </p>
        <p>
        <label htmlFor="panel-rows-input">on rows:</label>
        <input
          type="number" id="panel-rows-input"
          defaultValue={panelDefaults.rows}
          min="1" max={panelDefaults.total} ref="rows"
          onBlur={this.catchPanelChange.bind(this)}
          required
        ></input>
        </p>

      </fieldset>
    );
  }
  // GET PANEL INPUTS ends


  // GET LAYOUT FORM JSX
  // Called from makeFoldJsx to construct the JSX definitions for the Layout fold
  getLayoutFormJsx() {
    // Section dropdown
    const sectionSelect = this.getSectionSelect();
    // Chart type dropdown
    const typeSelect = this.getTypeSelect();
    // Panels inputs
    const panelInputs = this.getPanelInputs();
    //  ...and all the rest of it...
    // I don't think I need the onChange on the form...
    // onChange={this.catchLayoutFormChange.bind(this)}
    return (
      <form className="accordion-fold-form">
        {typeSelect}
        {sectionSelect}
        {panelInputs}
      </form>
    );
  }
  // GET FORM JSX ends

  // MAKE FOLD JSX
  // Builds accordian 'fold' (LI) and contents
  // Arg is a string referring to an element defined, above, in props.folds
  // In theory, this function will serve as a triage nurse for any 'fold'...
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
    // Switch on arg to get fold content:
    let foldContent = <span>Body of ${fName}</span>;
    switch (fName) {
      case 'data':
        foldContent = <span>Body of ${fName}</span>;
        break;
      case 'layout':
        foldContent = this.getLayoutFormJsx();
        break;
      case 'scales':
        foldContent = <span>Body of ${fName}</span>;
        break;
      default:
        foldContent = <span>Body of ${fName}</span>;
    }
    /* Structure is:
        li
          header div
            button div
            span
          body div
            fold-specific elements
    */
    return (
      <li className={liClass} key={fName}>
        <div className={headClass}>
          <div onClick={this.catchFoldButtonClick.bind(this)}>{bDisplay}</div>
          <span className="accordion-fold-head-span">{defText}</span>
        </div>
        <div className="accordion-fold-body">{foldContent}</div>
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
    // I'm only interested in opening folds that are currently closed
    if (thisFold.open) {
      return;
    }
    // Still here: I want to open a closed fold...
    for (const key in folds) {
      folds[key].open = (key === thisKey);
    }
    // Update state and re-render
    this.setState({ folds });
  }
  // CATCH FOLD BUTTON CLICK ends

  // RENDER
  // editorHeaderStructure is currently the context tab bar
  // remainder is the json-editor form
  render() {
    // Accordion structure...
    // NOTE: I could derive the fold ID names, below, from props definitions,
    // but sooner or later I hit inferential functions, so let's keep it crude and simple...
    // ...at least we can see what we're throwing around:
    const dataFoldJsx = this.makeFoldJsx('data');
    const layoutFoldJsx = this.makeFoldJsx('layout');
    const scalesFoldJsx = this.makeFoldJsx('scales');
    // Tab bar (dependent component) at top of chart div, for context choices:
    const tabBarJsx = this.getTabBarJsx();
    return (
      <div className="silverbullet-editor-wrapper">
        <div className="editor-outer-wrapper">
          <ul className="editor-accordion">
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
