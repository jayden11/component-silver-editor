// * global document */
import React from 'react';
// Tab bar component:
import SilverTabBar from '@economist/component-silver-tab-bar';
// The default config object, to be 'sharpened up' and passing down the tree...
import ConfigObject from './assets/default_config_object.json';
// Default preferences (complete set of style definitions):
import DefaultPreferences from './assets/default_preferences.json';
// Context-specific preferences:
import ContextPreferences from './assets/context_preferences.json';
// Utilities module
import * as EditorUtilities from './editorutilities';

export default class SilverEditor extends React.Component {

  // ===========================================================================
  // === REACT STUFF
  // === Props, state, lifecycle...
  // ===========================================================================

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
      // NOTE: folds are *explicitly* declared *5* times. Any new fold
      // is declared: here; in makeFoldJsx; twice in render (define as const, render);
      // and in css...
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
  // 'folds' definitions object is in state, for accordion (un)folding
  // TO COME: context definitions for tab-bar
  constructor(props) {
    super(props);
    this.state = {
      folds: props.folds,
    };
  }
  // CONSTRUCTOR ends

  // COMPONENT DID MOUNT
  componentDidMount() {
    this.updateSizes();
  }
  // COMPONENT DID MOUNT ends

  // ===========================================================================
  // === REACT STUFF ENDS
  // ===========================================================================


  // ===========================================================================
  // === UNSORTED FUNCTIONS
  // === A lot of this stuff is legacy from the original
  // === JsonForm schema. It all needs eventual adaptation/deletion...
  // ===========================================================================


  // SET DYNAMIC SCHEMA VALUES: in utilities
  // GET CHART INNER-BOX HEIGHT: in utilities
  // GET BAR CHART HEIGHT: in utilities

  // UPDATE SIZES
  updateSizes() {
    // Values from CO's metadata:
    const metadata = ConfigObject.metadata;
    const context = metadata.context;
    const subcontext = metadata.subcontext;
    const section = metadata.section;

    // But subcontext may have to change if I'm changing section
    // (eg from BR:narrow/medium/wide to LD:default... or vice versa)

    // I want a chain...
    const chain = [ 'background', 'outerbox', 'dimensions' ];
    const myNode = this.findPreferencesNode(context, section, chain);
    const subcontextNode = myNode[subcontext];
    //
    // const myNode = DefaultPreferences.background.outerbox.dimensions;
    // We always want to look (a) in defaults
    /*
    // By default, get sizes from default preferences:
    const contextNode = DefaultPreferences.outerbox.dimensions;
    // But is there a context node?
    // Is there a section-specific node in this context?
    // If not, use default...
    let sectionNode = contextNode[section];
    if (typeof sectionNode === 'undefined') {
      sectionNode = contextNode.default;
    }
    // Does the section define subcontexts? If not, use default...
    // (In practice, I think we'd always use 'default' for defined
    // subcontexts)
    let subcontextNode = sectionNode.outerbox.dimensions[subcontext];
    if (typeof subcontextNode === 'undefined') {
      subcontextNode = sectionNode.outerbox.dimensions.default;
    }
    */
    // Update inputs:
    this.refs.width.value = subcontextNode.width;
    this.refs.height.value = subcontextNode.height;
    // ...and the config object:
    ConfigObject.background.outerbox.width = subcontextNode.width;
    ConfigObject.background.outerbox.height = subcontextNode.height;
  }
  // UPDATE SIZES ends

  // FIND PREFERENCES NODE
  // Function returns a complete preferences node. It clones the (hopefully
  // complete!) default definition as its base. Then it scrabbles around,
  // by context and section, for a specific node. If a specific node is
  // found, it overwrites the default with whatever properties exist.
  // Args are: context id; section id; and an array of subnodes that
  // constitute a sort of 'chain' down to the node I'm looking for...
  // NOTE: this chain structure must be consistent across all prefs contexts,
  // sections, etc. And the 'end-of-chain' node must exist in the
  // default prefs...
  findPreferencesNode(context, section, chain) {
    // First, clone the node in default preferences:
    let defaultNode = DefaultPreferences;
    // Drill down:
    for (let link = 0; link < chain.length; link++) {
      defaultNode = defaultNode[chain[link]];
      // In case of error:
      if (typeof defaultNode === 'undefined') {
        return defaultNode;
      }
    }
    // Now clone the default target node:
    const returnNode = Object.assign({}, defaultNode);
    // That's the complete default node which (in theory at least!)
    // includes all the properties that could exist...
    // Now: are there any specific context/section overwrites?
    const contextNode = ContextPreferences[context];
    if (typeof contextNode === 'undefined') {
      // No specific context definition found (shouldn't happen, but still...)
      return returnNode;
    }
    // Now narrow context down to section:
    let specificNode = contextNode[section];
    if (typeof specificNode === 'undefined') {
      // No specific section node: use default
      specificNode = contextNode.default;
    }
    // Now look down the chain. If it breaks, return the default node
    for (let link = 0; link < chain.length; link++) {
      specificNode = specificNode[chain[link]];
      if (typeof specificNode === 'undefined') {
        return returnNode;
      }
    }
    // If I"m still here, I've isolated a specific target node.
    // Any properties found therein overwrite the defaults
//    if (typeof returnNode.length === 'undefined') {
      // Node is an object
    Object.assign(returnNode, specificNode);
//    } else if (returnNode.length === specificNode.length) {
      // Node is an array. If they (crudely) match, overwrite each
//      for (let iii = 0; iii < returnNode.length; iii++) {
//        Object.assign(returnNode[iii], specificNode[iii]);
//      }
//    }
    return returnNode;
  }

  // ======================

  // ASSEMBLE CONFIG OBJECT
  // Placeholder for config object validation, when/if needed...
  // Also does assembling of 'under-the-hood' properties
  assembleConfigObject() {
    // We need to know:
    const section = ConfigObject.metadata.section;
    const context = ConfigObject.metadata.context;
    // Margins
    // Where do I get margins from? Function should, in theory, return a node
    // where I can find what I want, either specific or default...
    // Args 1 & 2 are context and section; subsequent arguments will be 'spread'
    // into an array leading to a specific sub-node...
    const margins = this.findPreferencesNode(context, section, [ 'background', 'outerbox', 'margins' ]);
    ConfigObject.background.margins = margins;
    //
    // Next up: background shapes...
    // List is defined in defaults
    const shapeKeys = Object.keys(DefaultPreferences.background.shapes);
    const shapeArray = [];
    for (let iii = 0; iii < shapeKeys.length; iii++) {
      const oneShape = this.findPreferencesNode(context, section, [ 'background', 'shapes', shapeKeys[iii] ]);
      shapeArray.push(oneShape);
    }
    ConfigObject.background.shapes = shapeArray;
    //
    // Panels? Layout is already in metadata; but so far nothing on actual appearance...
    // ...which I'll leave for now, but would be context-based
    // ...and, assuming that nothing's gone wrong (not that I'm testing yet!)...
    return true;
  }
  // ASSEMBLE CONFIG OBJECT ends

  // FIELD UPDATED CONFIG OBJECT
  // Called from ALL form elements' event listeners...
  // ...if value is valid. Individual listeners have
  // updated the CO. In theory it is valid, but I may want
  // to do subsequent checks before tossing it up to Sibyl
  // NOTE: name of this function is wrong: do better!!! *** ***
  fieldUpdatedConfigObject() {
    this.updateSizes();
    if (this.assembleConfigObject()) {
      // Decouple:
      const config = Object.assign({}, ConfigObject);
      // ...and dispatch the CO back to Sibyl...
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
    const mmiObj = EditorUtilities.getScaleMinMaxIncr(dataObj.minVal, dataObj.maxVal,
        ticks, DefaultPreferences.other.plausibleIncrements);
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

  // ===========================================================================

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

  // FIELD CONTEXT FROM TAB BAR
  // Callback sent to the TabBar. Param is an object
  // with 2 props: parent (string)...
  // ...and children (array, possible empty, and currently redundant)
  fieldContextFromTabBar(obj) {
    // Reset reference object:
    ConfigObject.metadata.context = obj.parent;
    ConfigObject.metadata.subcontext = obj.child;
    // NOTE: comm'd out call that kicks off chart draw...
    this.updateSizes();
  }
  // FIELD CONTEXT FROM TAB BAR ends

  // UNPICK CONTEXTS
  // Called from getTabBarJSX to assemble the context definitions to pass
  // down to the TabBar component
  unpickContexts() {
    // Get default context and all context nodes from lookup:
    const defaultContext = DefaultPreferences.metadata.defaults.context;
    const defaultSubContext = DefaultPreferences.metadata.defaults.subcontext;
    // Result will be an array of context definitions
    const result = [];
    // Loop by context objects:
    Object.keys(ContextPreferences).forEach((key) => {
      // Exclude my comments (this needs to be deleted... or something... eventually)
      if (key.search('__') < 0) {
        const obj = ContextPreferences[key];
        // Init obj to return with context name
        // (All lower case; tab bar does uppercasing)
        const tempObj = { parent: key };
        // Subcontexts list:
        const children = [];
        Object.keys(obj.default.background.outerbox.dimensions).forEach((val) => {
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

  // ===========================================================================
  // === UNSORTED FUNCTIONS END
  // ===========================================================================

  // ===========================================================================
  // === EVENT CATCHERS ===
  // ===========================================================================
  // I think I have to sort these by:
  //  Accordion level
  //  Data fold
  //  Layout fold...

  // ACCORDION-LEVEL EVENTS

  // CATCH ACCORDION FOLD BUTTON CLICK
  // Event-catcher for click on accordian open-fold button
  // Resets state with updated fold open/close flag
  catchAccordionFoldButtonClick(evt) {
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
  // CATCH ACCORDION FOLD BUTTON CLICK ends

  // CATCH ACCORDION RESET BUTTON CLICK
  catchEditorResetButtonClick() {
    // Empty text area
    // Set strings back to default
    // Set width and height back to default...
  }

  // DATA FOLD EVENTS

  // CATCH DATA-FOLD TEXTAREA TAB EVENT
  // Called from render > textarea > keydown event to
  // pre-empt default tab-switches-focus and put a tab in data field
  catchDataFoldTextAreaTabEvent(event) {
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
  // CATCHDATA-FOLD TEXTAREA TAB EVENT ends

  // CATCHDATA-FOLD TEXTAREA PASTE EVENT
  // Listener for paste into data textarea
  catchDataFoldTextAreaPasteEvent() {
    // console.log('Running text area paste-in listener, although I cannot remember what it is supposed to do...');
  }
  // CATCH DATA-FOLD TEXTAREA PASTE EVENT ends

  // LAYOUT EVENTS

  // CATCH LAYOUT TYPE CHANGE
  // Listener to change event on chart Type dropdown
  catchLayoutTypeSelectChange(evt) {
    ConfigObject.metadata.type = evt.target.value;
    this.fieldUpdatedConfigObject();
  }

  // CATCH LAYOUT SECTION CHANGE
  // Listener to change event on Section dropdown
  catchLayoutSectionChange(evt) {
    const newSection = evt.target.value;
    ConfigObject.metadata.section = newSection;
    // But I also need to reset subcontext to default
    // Array sets chain to look...
    const chain = [ 'background', 'outerbox', 'dimensions' ];
    const sectionNode = this.findPreferencesNode(ConfigObject.metadata.context, newSection, chain);
    // Find default subcontext (width) node:
    let defaultStr = 'default';
    Object.keys(sectionNode).map((key) => {
      if (sectionNode[key].default) {
        defaultStr = key;
      }
    });
    ConfigObject.metadata.subcontext = defaultStr;
    // for (let subC in sectionNode)
    this.fieldUpdatedConfigObject();
  }
  // CATCH LAYOUT SECTION CHANGE ends

  // CATCH LAYOUT PANEL CHANGE
  catchLayoutPanelChange(evt) {
    // Extract panel property from input id
    const targ = evt.target;
    const targetId = targ.id.split('-')[1];
    const newVal = targ.value;
    const oldVal = ConfigObject.metadata.panels[targetId];
    // Validate (fcn in utilities module)...
    if (EditorUtilities.validatePanelValues(targetId, newVal, ConfigObject)) {
      // If targ is 'total' input, reset max on others:
      if (targetId === 'total') {
        this.refs.number.max = newVal;
        this.refs.rows.max = newVal;
        ConfigObject.metadata.panels[targetId] = newVal;
        this.fieldUpdatedConfigObject();
      }
    } else {
      // Reset target to previous value
      // Ideally there'd be some sort of alert...
      targ.value = oldVal;
    }
  }
  // CATCH LAYOUT PANEL CHANGE ends

  // CATCH LAYOUT SIZE CHANGE
  catchLayoutSizeChange(evt) {
    // Extract panel property from input id
    const targ = evt.target;
    const targetId = targ.id.split('-')[1];
    const newVal = targ.value;
    // Validate...?
    console.log(`${targetId.toUpperCase()} set to ${newVal}... am I doing anything with this?`);
  }
  // CATCH LAYOUT SIZE CHANGE ends

  // CATCH LAYOUT BAR SPAN EVENT
  // Listener to the 'recommended height' button
  catchLayoutRecommendedHeightyEvent(event) {
    // Get the value from the span...
    const val = parseFloat(event.target.textContent, 10);
    // ...and send to the input:
    const heightEl = this.editorForm.getEditor('root.dimensions.height');
    heightEl.setValue(val);
  }
  // CATCH LAYOUT BAR SPAN EVENT ends

  // ===========================================================================
  // === EVENT CATCHERS END ===
  // ===========================================================================


  // ===========================================================================
  // === JSX CONTRUCTORS =======================================================
  // === Functions assemble JSX structural elements
  // ===========================================================================

  // Sub-constructors ==========================================================
  // All, I assume initially, called from makeFoldJsx

  // DATA

  // LAYOUT

  // MAKE LAYOUT SECTION DROPDOWN
  // Dropdown for section selection ('BR' etc)
  // Called from makeLayoutFormJsx
  makeLayoutSectionDropdown() {
    const sectionArray = DefaultPreferences.metadata.sections;
    const options = sectionArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    const defaultValue = DefaultPreferences.metadata.defaults.section;
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
          onChange={this.catchLayoutSectionChange.bind(this)}
        >
          {options}
        </select>
      </p>
    );
  }
  // MAKE LAYOUT SECTION DROPDOWN ends

  // MAKE LAYOUT TYPE SELECT
  // Dropdown for chart type ('Line' etc.)
  // Called from makeLayoutFormJsx
  makeLayoutTypeDropdown() {
    const typeArray = DefaultPreferences.metadata.types;
    const options = typeArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    const defaultValue = DefaultPreferences.metadata.defaults.type;
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
          onChange={this.catchLayoutTypeSelectChange.bind(this)}
        >
          {options}
        </select>
      </p>
    );
  }
  // MAKE TYPE SELECT ends

  // MAKE LAYOUT PANEL FIELDSET
  // Called from makeLayoutFormJsx to construct panels fieldset
  makeLayoutPanelFieldset() {
    // Get defaults from prefs
    const panelDefaults = DefaultPreferences.metadata.defaults.panels;
    // Update pass to config object
    ConfigObject.metadata.panels = panelDefaults;
    return (
      <fieldset className="layout-panels-fieldset">
        <legend>Panels</legend>
        <p>
        <label htmlFor="panel-number-input">number:</label>
        <input
          type="number" id="panel-number-input"
          defaultValue={panelDefaults.number}
          min="1" max={panelDefaults.total} ref="number"
          onBlur={this.catchLayoutPanelChange.bind(this)}
          required
        ></input>
        </p>
        <p>
        <label htmlFor="panel-total-input">of total:</label>
        <input
          type="number" id="panel-total-input"
          defaultValue={panelDefaults.total}
          min="1" max="8" ref="total"
          onBlur={this.catchLayoutPanelChange.bind(this)}
          required
        ></input>
        </p>
        <p>
        <label htmlFor="panel-rows-input">on rows:</label>
        <input
          type="number" id="panel-rows-input"
          defaultValue={panelDefaults.rows}
          min="1" max={panelDefaults.total} ref="rows"
          onBlur={this.catchLayoutPanelChange.bind(this)}
          required
        ></input>
        </p>

      </fieldset>
    );
  }
  // MAKE LAYOUT PANEL FIELDSET ends

  // MAKE LAYOUT SIZE FIELDSET
  // Called from makeLayoutFormJsx, to construct chart size fieldset
  makeLayoutSizeFieldset() {
    // Get defaults from prefs
    const panelDefaults = DefaultPreferences.metadata.defaults.panels;
    // Update pass to config object
    // NOTE:    ConfigObject.metadata.panels = panelDefaults;
    // (what was this...?)
    return (
      <fieldset className="layout-size-fieldset">
        <legend>Size</legend>
        <p>
          <label htmlFor="size-width-input">width:</label>
          <input
            type="number" id="size-width-input"
            min="50" ref="width"
            onBlur={this.catchLayoutSizeChange.bind(this)}
            required
          ></input>
        </p>
        <p>
          <label htmlFor="size-height-input">height:</label>
          <input
            type="number" id="size-height-input"
            min="50" ref="height"
            onBlur={this.catchLayoutSizeChange.bind(this)}
            required
          ></input>
        </p>
      </fieldset>
    );
  }
  // MAKE LAYOUT SIZE FIELDSET ends

  // MAKE LAYOUT FORM JSX
  // Main Layout form constructor, called from makeFoldJsx
  // Calls sub-functions to construct individual elements and clusters
  makeLayoutFormJsx() {
    // Section dropdown
    const sectionSelect = this.makeLayoutSectionDropdown();
    // Chart type dropdown
    const typeSelect = this.makeLayoutTypeDropdown();
    // Panels inputs
    const panelFieldSet = this.makeLayoutPanelFieldset();
    // Size inputMAKE
    const sizeFieldSet = this.makeLayoutSizeFieldset();
    //  ...and all the rest of it...
    // I don't think I need the onChange on the form...
    // onChange={this.catchLayoutFormChange.bind(this)}
    return (
      <form className="accordion-fold-form">
        {typeSelect}
        {sectionSelect}
        {panelFieldSet}
        {sizeFieldSet}
      </form>
    );
  }
  // MAKE LAYOUT FORM JSX ends

  // OTHER FORMS TO COME...

  // Main constructors =========================================================
  // Fold constructor
  // Header constructor

  // MAKE FOLD JSX
  // Called from RENDER to build accordian 'fold' (LI) and contents
  // Arg is a string referring to an element defined in props.folds
  // In theory, this function will serve as a triage nurse for any 'fold',
  // calling a sub-constructor (above) to build the particular FORM...
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
        foldContent = this.makeLayoutFormJsx();
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
          <div onClick={this.catchAccordionFoldButtonClick.bind(this)}>{bDisplay}</div>
          <span className="accordion-fold-head-span">{defText}</span>
        </div>
        <div className="accordion-fold-body">{foldContent}</div>
      </li>
    );
  }
  // MAKE FOLD JSX ends

  // MAKE HEADER JSX
  // Called from render to assemble the context options tab bar
  // NOTE: I'm wrapping the tab bar in a 'header' div. This is
  // in case I decide to add any other content...
  makeHeaderJsx() {
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
            <p onClick={this.catchEditorResetButtonClick.bind(this)}>Reset</p>
          </div>
        </div>
      </div>
    );
  }
  // MAKE HEADER JSX ends

  // ===========================================================================
  // === EDITOR/ACCORDION/FOLD CONSTRUCTORS end ===
  // ===========================================================================

  // ===========================================================================
  // RENDER
  render() {
    // Accordion structure...
    // NOTE: I could derive the fold ID names, below, from props definitions,
    // but sooner or later I hit inferential functions, so let's keep it crude and simple...
    const dataFoldJsx = this.makeFoldJsx('data');
    const layoutFoldJsx = this.makeFoldJsx('layout');
    const scalesFoldJsx = this.makeFoldJsx('scales');
    // Header stretches across entire Sibyl window and contains
    // - Tab bar (dependent component) for context choices
    // - Reset button (for now, at least...)
    const headerJsx = this.makeHeaderJsx();
    return (
      <div className="silverbullet-editor-wrapper">
        <div className="editor-outer-wrapper">
          <ul className="editor-accordion">
            {dataFoldJsx}
            {layoutFoldJsx}
            {scalesFoldJsx}
          </ul>
        </div>
        {headerJsx}
      </div>
    );
  }
}
