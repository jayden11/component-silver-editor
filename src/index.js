import React from 'react';
// Utilities module
import * as EditorUtilities from './editorutilities.js';
// Tab bar component:
import SilverTabBar from '@economist/component-silver-tab-bar';

// The default config object, to be 'sharpened up' and passing down the tree...
import DefaultConfigObject from '../assets/default_config_object.json';
// Default preferences ( complete set of style definitions):
import DefaultPreferences from '../assets/default_preferences.json';
// Platform-specific preferences:
import PlatformPreferences from '../assets/platform_preferences.json';

export default class SilverEditor extends React.Component {

  // ===========================================================================
  // === REACT LIFECYCLE
  // === Props, state, lifecycle...
  // ===========================================================================

  // PROP TYPES
  static get propTypes() {
    return {
      // Callback to Sibyl
      passUpdatedConfig: React.PropTypes.func.isRequired,
      // Default fold definitions, which it seems reasonable to keep here...
      folds: React.PropTypes.object,
      // If I'm debugging Editor directly, I just want to know, so I
      // can tweak the CSS for better display...
      parentCheck: React.PropTypes.string,
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
        chartdata: { iden: 'chartdata', display: 'Chart Data', defaultText: 'Fold for chartdata textarea',
          valid: false, open: false },
        layout: { iden: 'layout', display: 'Layout', defaultText: 'Chart type, section and structure',
          valid: false, open: true },
        scales: { iden: 'scales', display: 'Scales', defaultText: 'Chart scales',
          valid: false, open: false },
      },
      passUpdatedConfig: (evt) => {
        /* eslint-disable no-console */
        // So we can see what we're tossing out of the basket:
        console.log(evt);
        /* eslint-enable */
      },
    };
  }

  // CONSTRUCTOR
  // 'folds' definitions object is in state, for accordion (un)folding
  // TO COME: platform definitions for tab-bar
  constructor(props) {
    super(props);
    this.state = {
      folds: props.folds,
      platforms: [],
    };
    // Fold open/close btn
    this.handleAccordionFoldButtonClick = this.handleAccordionFoldButtonClick.bind(this);
    // LAYOUT fold: section, chart-type, size, panels...
    this.handleLayoutSectionChange = this.handleLayoutSectionChange.bind(this);
    this.handleLayoutTypeSelectChange = this.handleLayoutTypeSelectChange.bind(this);
    this.handleLayoutSizeChange = this.handleLayoutSizeChange.bind(this);
    this.handleLayoutPanelChange = this.handleLayoutPanelChange.bind(this);
    // Reset button (NOTE: not currently visible)
    this.handleEditorResetButtonClick = this.handleEditorResetButtonClick.bind(this);
    // Callback from tab bar: platform/subplatform
    this.handlePlatformFromTabBar = this.handlePlatformFromTabBar.bind(this);
    // Active config object and array:
    this.configObject = {};
    // NOTE: I'm not sure whether an array is right. Maybe an object...
    this.configObjectArray = [];
  }
  // CONSTRUCTOR ends

  // COMPONENT WILL MOUNT
  // Calls makeNewConfigObject to assemble a new default CO
  componentWillMount() {
    const coIndex = 0;
    this.makeNewConfigObject(coIndex);
    this.unpickPlatforms();
  }
  // COMPONENT WILL MOUNT ends

  // COMPONENT DID MOUNT
  // Call function to populate the folds
  componentDidMount() {
    this.updateSizes(true);
    this.fieldUpdates();
  }
  // COMPONENT DID MOUNT ends

  // ===========================================================================
  // === REACT LIFECYCLE ENDS
  // ===========================================================================


  // ===========================================================================
  // CONFIG OBJECT: IN AND OUT
  // ===========================================================================

  // POPULATE FORM ELEMENTS
  // Called from componentWillMount.
  // Extracts values from active CO and displays.
  // NOTE: this should also be callable if user switches panels...
  populateFormElements() {
    // This seems inescapable inferential...
    const metadata = this.configObject.metadata;
    // *** Raw data? ***
    // NOTE: this goes into an element of the charts array
    // *** Layout ***
    // Section
    const sectionVal = metadata.section;
    this.refs['section-select'].value = sectionVal;
    // Panels
    const panelVals = metadata.panels;
    this.refs.panelNumber.value = panelVals.number;
    this.refs.panelNumber.max = panelVals.total;
    this.refs.panelTotal.value = panelVals.total;
    this.refs.panelRows.value = panelVals.rows;
    this.refs.panelRows.max = panelVals.total;
    // Panels total may change number of elements in charts array:
    if (panelVals.total > this.configObject.charts.length) {
      // Add new, empty chart objects:
      for (let chIndex = this.configObject.charts.length; chIndex < panelVals.total; chIndex++) {
        this.configObject.charts.push(this.getNewChartObject());
      }
    } else if (panelVals.total < this.configObject.charts.length) {
      // Delete excess chart objects
      for (let chIndex = this.configObject.charts.length; chIndex > panelVals.total; chIndex--) {
        this.configObject.charts.pop();
      }
    }
    // From panel number:
    // Chart index...
    metadata.chartindex = panelVals.number - 1;
    // ...and chart type
    // NOTE: I suspect that chart type eventually moves to the chart-data fold
    // But for now...
    const typeVal = this.configObject.charts[metadata.chartindex].type;
    this.refs['type-select'].value = typeVal;
    // Sizes
    const sizeVals = this.configObject.background.outerbox.dimensions;
    this.refs.sizeWidth.value = sizeVals.width;
    this.refs.sizeHeight.value = sizeVals.height;

    // *** Other folds to come ***
  }
  // POPULATE FORM ELEMENTS ends

  // MAKE NEW CONFIG OBJECT
  // Called from componentWillMount...
  // NOTE: also when new panel is added
  // Clones the default CO and calls fcn to populate it. Then sets it
  // as activeCO and appends to CO array...
  // NOTE: ...which may want to be an object
  makeNewConfigObject() {
    // Clone empty config structure
    const emptyConfig = Object.assign({}, DefaultConfigObject);
    // Insert default properties and set as global:
    this.configObject = this.getDefaultConfigObjectProperties(emptyConfig);
  }
  // MAKE NEW CONFIG OBJECT ends

  // GET NEW CHART OBJECT
  // Called from getDefaultConfigObjectProperties and populateFormElements
  // Creates a new chart data object with default type
  getNewChartObject() {
    // Chart object:
    const newChart = {
      type: DefaultPreferences.metadata.defaults.type,
      chartdata: [],
    };
    return newChart;
  }

  // GET DEFAULT CONFIG OBJECT PROPERTIES
  // Called from makeNewConfigObj to set properties to default
  // values in default preferences file. These default properties are:
  // - metadata: newchart, panels, platform, section, subplatform, type
  // - background.outerbox: dimensions
  // NOTE: others, no doubt, to come. This might include margins, if I
  // want to display any for overwriting...
  getDefaultConfigObjectProperties(config) {
    // Metadata
    const metadata = Object.assign({}, DefaultPreferences.metadata.defaults);
    config.charts[metadata.chartindex] = this.getNewChartObject();
    // I originally dug out a default background (width, height, margins)
    // But w/h are extracted by updateSizes, based on platform/section
    // Margins are currently done on dispatch, altho I may change that
    // to allow user-overwrite
    // Delete default type from metadata:
    // NOTE: keeping panel no/of/rows in metadata
    config.metadata = metadata;
    return config;
  }
  // GET DEFAULT CONFIG OBJECT PROPERTIES ends

  // ===========================================================================
  // === UNSORTED FUNCTIONS
  // === A lot of this stuff is legacy from the original
  // === JsonForm schema. It all needs eventual adaptation/deletion...
  // ===========================================================================


  // SET DYNAMIC SCHEMA VALUES: in utilities
  // GET CHART INNER-BOX HEIGHT: in utilities
  // GET BAR CHART HEIGHT: in utilities

  // UPDATE SIZES
  // Called from handleLayoutSectionChange
  // Updates size values in aCO, based on (sub-)platformm and section
  updateSizes(redisplay) {
    // Values from aCO's metadata:
    const metadata = this.configObject.metadata;
    const platform = metadata.platform;
    const subplatform = metadata.subplatform;
    const section = metadata.section;
    // subplatform may have to change if I'm changing section
    // (eg from BR:narrow/medium/wide to LD:default... or vice versa)
    // I want a chain...
    const chain = [ 'background', 'outerbox', 'dimensions' ];
    // Find the relevant node...
    const myNode = this.findPreferencesNode(platform, section, chain);
    const subplatformNode = myNode[subplatform];
    // Update the aCO (as complete dimensions node, since when this is
    // called from componentDidMount it doesn't exist)
    const dims = {
      height: subplatformNode.height,
      width: subplatformNode.width,
    };
    this.configObject.background.outerbox.dimensions = dims;
    // If requested, update the display...
    if (redisplay) {
      this.populateFormElements();
    }
  }
  // UPDATE SIZES ends

  // FIND PREFERENCES NODE
  // Function returns a complete preferences node. It clones the (hopefully
  // complete!) default definition as its base. Then it scrabbles around,
  // by platform and section, for a specific node. If a specific node is
  // found, it overwrites the default with whatever properties exist.
  // Args are: platform id; section id; and an array of subnodes that
  // constitute a sort of 'chain' down to the node I'm looking for...
  // NOTE: this chain structure must be consistent across all prefs platforms,
  // sections, etc. And the 'end-of-chain' node must exist in the
  // default prefs...
  findPreferencesNode(platform, section, chain) {
    // First, clone the node in default preferences:
    let defaultNode = DefaultPreferences;
    // Drill down:
    for (let link = 0; link < chain.length; link++) {
      const testNode = defaultNode[chain[link]];
      // In case of error:
      if (typeof testNode === 'undefined') {
        return defaultNode;
      }
      // Still here?
      defaultNode = defaultNode[chain[link]];
    }
    // So now (in theory, at least) defaultNode is the target node
    // in the default preferences...
    // Clone it:
    const returnNode = Object.assign({}, defaultNode);
    // That's the complete default node which (in theory at least!)
    // includes all the properties that could exist...
    // Now: are there any specific platform/section overwrites?
    const platformNode = PlatformPreferences[platform];
    if (typeof platformNode === 'undefined') {
      // No specific platform definition found (shouldn't happen, but still...)
      return returnNode;
    }
    // Now narrow platform down to section:
    let specificNode = platformNode[section];
    if (typeof specificNode === 'undefined') {
      // No specific section node: use default
      specificNode = platformNode.default;
    }
    // Now look down the chain. If it breaks, return the default node
    for (let link = 0; link < chain.length; link++) {
      const testNode = specificNode[chain[link]];
      if (typeof testNode === 'undefined') {
        return returnNode;
      }
      specificNode = specificNode[chain[link]];
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

  // FIELD UPDATES
  // Called from...
  // Individual listeners have
  // updated the CO. In theory it is valid, but I may want
  // to do subsequent checks before tossing it up to Sibyl
  fieldUpdates() {
    // I need to fetch in various properties
    // We need to know:
    const section = this.configObject.metadata.section;
    const platform = this.configObject.metadata.platform;
    // Margins
    // Where do I get margins from? Function should, in theory, return a node
    // where I can find what I want, either specific or default...
    // Args 1 & 2 are platform and section; subsequent arguments will be 'spread'
    // into an array leading to a specific sub-node...
    const margins = this.findPreferencesNode(platform, section, [ 'background', 'outerbox', 'margins' ]);
    this.configObject.background.margins = margins;
    //
    // Next up: background shapes...
    // List is defined in defaults
    const shapeKeys = Object.keys(DefaultPreferences.background.shapes);
    const shapeArray = [];
    for (let iii = 0; iii < shapeKeys.length; iii++) {
      const oneShape = this.findPreferencesNode(platform, section, [ 'background', 'shapes', shapeKeys[iii] ]);
      shapeArray.push(oneShape);
    }
    this.configObject.background.shapes = shapeArray;
    // Kill the redundant 'type' property in the metadata node
    // NOTE: don't really like this... is there a better location
    // for the default type in the lookups?
    Reflect.deleteProperty(this.configObject.metadata, 'type');
    // NOTE: I may have to do validation...
    //
    // Some debugging if I'm running the Editor independently:
    if (typeof this.props.parentCheck === 'undefined') {
      /* eslint-disable no-console */
      console.log('If I was running under Sibyl, this is what I would send upstairs...');
      console.log(this.configObject);
      /* eslint-enable no-console */
    }
    this.props.passUpdatedConfig(this.configObject);
  }

  // FIELD PLATFORM FROM TAB BAR
  // Callback sent to the TabBar. Param is an object
  // with 2 props: parent (string)...
  // ...and children (array, possible empty, and currently redundant)
  handlePlatformFromTabBar(obj) {
    // Reset reference object:
    this.configObject.metadata.platform = obj.parent;
    this.configObject.metadata.subplatform = obj.child;
    this.updateSizes(true);
    this.fieldUpdates();
  }
  // FIELD PLATFORM FROM TAB BAR ends

  // UNPICK PLATFORMS
  // Called from componentWillMount, and handleLayoutSectionChange
  // Works out platform definitions and resets state to force
  // render with revised TabBar component
  unpickPlatforms() {
    // Get default platform and all platform nodes from lookup:
    // const defaultPlatform = DefaultPreferences.metadata.defaults.platform;
    const platform = this.configObject.metadata.platform;
    const section = this.configObject.metadata.section;
    // Result will be an array of platform definitions
    const platforms = [];
    // Loop by platform objects:
    Object.keys(PlatformPreferences).forEach((key) => {
      // Exclude my comments (this needs to be deleted... or something... eventually)
      if (key.search('__') < 0) {
        const obj = PlatformPreferences[key];
        // Init obj to return with platform name
        // (All lower case; tab bar does uppercasing)
        const tempObj = { parent: key };
        // Subplatforms list:
        const children = [];
        //
        let myNode = obj[section];
        if (typeof myNode === 'undefined') {
          myNode = obj.default;
        }
        Object.keys(myNode.background.outerbox.dimensions).forEach((val) => {
          children.push(val);
        });
        // So we have an array of child names.
        // ( Platforms with no subplatform: children = ['default'] )
        tempObj.children = children;
        // Flag for default hightlight on tab bar
        tempObj.default = (key === platform);
        platforms.push(tempObj);
      }
    });
    this.setState({ platforms });
  }
  // UNPICK PLATFORMS ends

  // ===========================================================================
  // === UNSORTED FUNCTIONS END
  // ===========================================================================

  // ===========================================================================
  // === EVENT HANDLERS ===
  // ===========================================================================
  // I think I have to sort these by:
  //  Accordion level
  //  Chart data fold
  //  Layout fold...

  // ACCORDION-LEVEL EVENTS

  // HANDLE ACCORDION FOLD BUTTON CLICK
  // Event-handler for click on accordian open-fold button
  // Resets state with updated fold open/close flag
  handleAccordionFoldButtonClick(evt) {
    const folds = this.state.folds;
    const thisKey = evt.target.innerHTML.toLowerCase().replace(/\s+/g, '');
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
  // HANDLE ACCORDION FOLD BUTTON CLICK ends

  // HANDLE ACCORDION RESET BUTTON CLICK
  handleEditorResetButtonClick() {
    // Empty text area
    // Set strings back to default
    // Set width and height back to default...
  }

  // DATA FOLD EVENTS

  // HANDLE DATA-FOLD TEXTAREA TAB EVENT
  // Called from render > textarea > keydown event to
  // pre-empt default tab-switches-focus and put a tab in chartdata field
  handleDataFoldTextAreaTabEvent(event) {
    const tabCode = 9;
    if (event.keyCode === tabCode) {
      // prevent the focus loss
      event.preventDefault();
      const target = event.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const textBefore = value.substring(0, start);
      const textAfter = value.substring(end);
      // set textarea value to: text before cursor + tab + text after cursor
      target.value = `${ textBefore }\t${ textAfter }`;
      // put cursor at right position again (add one for the tab)
      target.selectionStart = target.selectionEnd = start + 1;
    }
  }
  // HANDLEDATA-FOLD TEXTAREA TAB EVENT ends

  // HANDLEDATA-FOLD TEXTAREA PASTE EVENT
  // Listener for paste into chartdata textarea
  handleDataFoldTextAreaPasteEvent() {
    // console.log('Running text area paste-in listener, although I cannot remember what it is supposed to do...');
  }
  // HANDLE DATA-FOLD TEXTAREA PASTE EVENT ends

  // LAYOUT EVENTS

  // HANDLE LAYOUT TYPE CHANGE
  // Listener to change event on chart Type dropdown
  handleLayoutTypeSelectChange(evt) {
    const type = evt.target.value;
    const chartindex = this.configObject.metadata.chartindex;
    this.configObject.charts[chartindex].type = type;
    // Don't do updateSizes (don't want to overwrite any user-
    // change of sizes...)
    this.fieldUpdates();
  }

  // HANDLE LAYOUT SECTION CHANGE
  // Listener to change event on Section dropdown
  handleLayoutSectionChange(evt) {
    const metadata = this.configObject.metadata;
    const newSection = evt.target.value;
    metadata.section = newSection;
    // But I also need to reset subplatform to default
    // Array sets chain to look...
    const chain = [ 'background', 'outerbox', 'dimensions' ];
    const sectionNode = this.findPreferencesNode(metadata.platform, newSection, chain);
    // Find default subplatform (width) node:
    let defaultStr = 'default';
    // NOTE: is there a better way of doing this?
    for (const key in sectionNode) {
      if (sectionNode[key].default) {
        defaultStr = key;
      }
    }
    metadata.subplatform = defaultStr;
    // Update sizes in aCO, with arg to redisplay, too...
    this.updateSizes(true);
    // And send it all upstairs...
    this.fieldUpdates();
    // And update the tab bar:
    this.unpickPlatforms();
  }
  // HANDLE LAYOUT SECTION CHANGE ends

  // HANDLE LAYOUT PANEL CHANGE
  // Change to panel number, total or rows...
  handleLayoutPanelChange(evt) {
    const panels = this.configObject.metadata.panels;
    // Extract id and val from event
    const targ = evt.target;
    const targetId = targ.id.split('-')[1];
    const newVal = targ.value;
    const oldVal = panels[targetId];
    // Validate (fcn in utilities module)
    if (EditorUtilities.validatePanelValues(targetId, newVal, panels)) {
      // New val is OK: update aCO by ref...
      panels[targetId] = newVal;
      // ...and repopulate the form
      this.populateFormElements();
    } else {
      // Reset target to previous value
      // NOTE: ideally there'd be some sort of alert...
      targ.value = oldVal;
    }
    // And send it all upstairs...
    this.fieldUpdates();
  }
  // HANDLE LAYOUT PANEL CHANGE ends

  // HANDLE LAYOUT SIZE CHANGE
  handleLayoutSizeChange(evt) {
    // Extract panel property from input id
    const targ = evt.target;
    const targetId = targ.id.split('-')[1];
    const newVal = targ.value;
    // Validate...?
    /* eslint-disable no-console */
    // NOTE: console.log as reminder of functionality to come...
    console.log(`${ targetId.toUpperCase() } reset to ${ newVal }... am I doing anything with this?`);
    /* eslint-enable no-console*/
  }
  // HANDLE LAYOUT SIZE CHANGE ends

  // HANDLE LAYOUT BAR SPAN EVENT
  // Listener to the 'recommended height' button
  // NOTE: just a Placeholder: functionality doesn't exist yet...
  handleLayoutRecommendedHeightEvent(event) {
    // Get the value from the span...
    const val = parseFloat(event.target.textContent);
    // ...and send to the input:
    const heightEl = this.editorForm.getEditor('root.dimensions.height');
    heightEl.setValue(val);
  }
  // HANDLE LAYOUT BAR SPAN EVENT ends

  // ===========================================================================
  // === EVENT HANDLERS END ===
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
    // Available options from default prefs
    const sectionArray = DefaultPreferences.metadata.sections;
    const options = sectionArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    return (
      <p className="fold-form-p">
        <label className="fold-form-label"
          htmlFor="accordion-section-select"
        >
          Section
        </label>
        <select className="accordion-select"
          id="accordion-section-select" ref="section-select"
          onChange={this.handleLayoutSectionChange}
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
    return (
      <p className="fold-form-p">
        <label className="fold-form-label"
          htmlFor="accordion-type-select"
        >
          Chart type
        </label>
        <select className="accordion-select"
          id="accordion-type-select" ref="type-select"
          onChange={this.handleLayoutTypeSelectChange}
        >
          {options}
        </select>
      </p>
    );
  }
  // MAKE TYPE SELECT ends

  // MAKE LAYOUT PANEL FIELDSET
  // Called from makeLayoutFormJsx to construct panels fieldset
  // NOTE: no default values set now. And max vals for number and
  // rows are dynamic
  makeLayoutPanelFieldset() {
    const inputClass = 'layout-panels-fieldset-input';
    return (
      <fieldset className="accordion-fieldset layout-panels-fieldset">
        <legend>Panels</legend>
        <p className="fold-form-p">
        <label htmlFor="panel-number-input">number:</label>
        <input
          type="number" id="panel-number-input"
          className={inputClass}
          min="1" ref="panelNumber"
          onBlur={this.handleLayoutPanelChange}
          required
        ></input>
        </p>
        <p className="fold-form-p">
        <label htmlFor="panel-total-input">of total:</label>
        <input
          type="number" id="panel-total-input"
          className={inputClass}
          min="1" max="8" ref="panelTotal"
          onBlur={this.handleLayoutPanelChange}
          required
        ></input>
        </p>
        <p className="fold-form-p">
        <label htmlFor="panel-rows-input">on rows:</label>
        <input
          type="number" id="panel-rows-input"
          className={inputClass}
          min="1" ref="panelRows"
          onBlur={this.handleLayoutPanelChange}
          required
        ></input>
        </p>
      </fieldset>
    );
  }
  // MAKE LAYOUT PANEL FIELDSET ends

  // MAKE LAYOUT SIZE FIELDSET
  // Called from makeLayoutFormJsx, to construct chart size fieldset
  // NOTE: no content now...
  makeLayoutSizeFieldset() {
    const inputClass = 'layout-size-fieldset-input';
    return (
      <fieldset className="accordion-fieldset layout-size-fieldset">
        <legend>Size</legend>
        <p className="fold-form-p">
          <label htmlFor="size-width-input">width:</label>
          <input
            type="number" id="size-width-input"
            className={inputClass}
            min="50" ref="sizeWidth"
            onBlur={this.handleLayoutSizeChange}
            required
          ></input>
        </p>
        <p className="fold-form-p">
          <label htmlFor="size-height-input">height:</label>
          <input
            type="number" id="size-height-input"
            className={inputClass}
            min="50" ref="sizeHeight"
            onBlur={this.handleLayoutSizeChange}
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
    // onChange={this.handleLayoutFormChange.bind(this)}
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
    // Default class for accordion LI 'folds':
    let liClass = 'editor-accordion-fold ';
    // And inferential class sets height
    if (stateFold.open) {
      liClass += `${ fName }-fold`;
    }
    const headClass = `fold-head-div ${ fName }-fold-head`;
    const bDisplay = propFold.display;
    const defText = propFold.defaultText;
    // Switch on arg to get fold content:
    let foldContent = <span>Body of ${fName}</span>;
    switch (fName) {
      case 'chartdata':
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
          <div
            className="fold-head-button"
            onClick={this.handleAccordionFoldButtonClick}
          >
            {bDisplay}
          </div>
          <span className="fold-head-span">{defText}</span>
        </div>
        <div className="fold-body-div">{foldContent}</div>
      </li>
    );
  }
  // MAKE FOLD JSX ends

  // MAKE HEADER JSX
  // Called from render to assemble the platform options tab bar
  // NOTE: I'm wrapping the tab bar in a 'header' div. This is
  // in case I decide to add any other content...
  makeHeaderJsx() {
    let headerClass = 'editor-header-wrapper';
    let choicesClass = 'chart-platform-choices-div';
    // Crude check for a parent. If none, I add a class to narrow header to 100%
    // NOTE: there must be a grownup who can tell me how to do this properly
    if (typeof (this.props.parentCheck) === 'undefined') {
      headerClass += ' parentless-header';
      choicesClass += ' parentless-choices';
    }
    return (
      <div className={headerClass}>
         <div className={choicesClass}>
          <SilverTabBar
            tabBarDefinitions={this.state.platforms}
            onPassPlatformToEditor={this.handlePlatformFromTabBar}
          />
        </div>
        <div className="chart-reset-wrapper">
          <div className="silverbullet-reset-button" id="silverbullet-reset-button">
            <p onClick={this.handleEditorResetButtonClick}>Reset</p>
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
  // Rerenders when accordion or tab-bar structure changes
  render() {
    // Accordion structure...
    // NOTE: I could derive the fold ID names, below, from props definitions,
    // but sooner or later I hit inferential functions, so let's keep it crude and simple...
    const chartdataFoldJsx = this.makeFoldJsx('chartdata');
    const layoutFoldJsx = this.makeFoldJsx('layout');
    const scalesFoldJsx = this.makeFoldJsx('scales');
    // Header stretches across entire Sibyl window and contains
    // - Tab bar (dependent component) for platform choices
    // - Reset button (removedfor now, at least...)
    const headerJsx = this.makeHeaderJsx();
    // Next was prev'y the outer wrapper rendered here. But now
    // rendered by Sibyl...
    // <div className="silverbullet-editor-wrapper">
    // </div>
    return (
        <div className="editor-outer-wrapper">
          <ul className="editor-accordion">
            {chartdataFoldJsx}
            {layoutFoldJsx}
            {scalesFoldJsx}
          </ul>
          {headerJsx}
        </div>
    );
  }
}
