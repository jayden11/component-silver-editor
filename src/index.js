import React from 'react';
// Utilities module
import * as EditorUtilities from './editorutilities.js';
// Tab bar component:
import SilverTabBar from '@economist/component-silver-tab-bar';

// The default config object, to be 'sharpened up' and passing down the tree...
import ConfigObject from '../assets/default_config_object.json';
// Default preferences ( complete set of style definitions):
import DefaultPreferences from '../assets/default_preferences.json';
// Platform-specific preferences:
import PlatformPreferences from '../assets/platform_preferences.json';

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
        chartdata: { iden: 'chartdata', display: 'Chart Data', defaultText: 'Fold for chartdata textarea',
          valid: false, open: false },
        layout: { iden: 'layout', display: 'Layout', defaultText: 'Chart type, section and structure',
          valid: false, open: true },
        scales: { iden: 'scales', display: 'Scales', defaultText: 'Chart scales',
          valid: false, open: false },
      },
      passUpdatedConfig: Function.prototype,
    };
  }

  // CONSTRUCTOR
  // 'folds' definitions object is in state, for accordion (un)folding
  // TO COME: platform definitions for tab-bar
  constructor(props) {
    super(props);
    this.state = {
      folds: props.folds,
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
  }
  // CONSTRUCTOR ends

  // COMPONENT DID MOUNT
  componentDidMount() {
    this.updateSizes();
    this.fieldUpdatedConfigObject();
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
    const platform = metadata.platform;
    const subplatform = metadata.subplatform;
    const section = metadata.section;
    // But subplatform may have to change if I'm changing section
    // (eg from BR:narrow/medium/wide to LD:default... or vice versa)

    // I want a chain...
    const chain = [ 'background', 'outerbox', 'dimensions' ];
    const myNode = this.findPreferencesNode(platform, section, chain);
    const subplatformNode = myNode[subplatform];
    //
    // const myNode = DefaultPreferences.background.outerbox.dimensions;
    // We always want to look (a) in defaults
    /*
    // By default, get sizes from default preferences:
    const platformNode = DefaultPreferences.outerbox.dimensions;
    // But is there a platform node?
    // Is there a section-specific node in this platform?
    // If not, use default...
    let sectionNode = platformNode[section];
    if (typeof sectionNode === 'undefined') {
      sectionNode = platformNode.default;
    }
    // Does the section define subplatforms? If not, use default...
    // (In practice, I think we'd always use 'default' for defined
    // subplatforms)
    let subplatformNode = sectionNode.outerbox.dimensions[subplatform];
    if (typeof subplatformNode === 'undefined') {
      subplatformNode = sectionNode.outerbox.dimensions.default;
    }
    */
    // Update inputs:
    this.refs.width.value = subplatformNode.width;
    this.refs.height.value = subplatformNode.height;
    // ...and the config object:
    ConfigObject.background.outerbox.width = subplatformNode.width;
    ConfigObject.background.outerbox.height = subplatformNode.height;
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
    const platform = ConfigObject.metadata.platform;
    // Margins
    // Where do I get margins from? Function should, in theory, return a node
    // where I can find what I want, either specific or default...
    // Args 1 & 2 are platform and section; subsequent arguments will be 'spread'
    // into an array leading to a specific sub-node...
    const margins = this.findPreferencesNode(platform, section, [ 'background', 'outerbox', 'margins' ]);
    ConfigObject.background.margins = margins;
    //
    // Next up: background shapes...
    // List is defined in defaults
    const shapeKeys = Object.keys(DefaultPreferences.background.shapes);
    const shapeArray = [];
    for (let iii = 0; iii < shapeKeys.length; iii++) {
      const oneShape = this.findPreferencesNode(platform, section, [ 'background', 'shapes', shapeKeys[iii] ]);
      shapeArray.push(oneShape);
    }
    ConfigObject.background.shapes = shapeArray;
    //
    // Panels? Layout is already in metadata; but so far nothing on actual appearance...
    // ...which I'll leave for now, but would be platform-based
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

  // FIELD PLATFORM FROM TAB BAR
  // Callback sent to the TabBar. Param is an object
  // with 2 props: parent (string)...
  // ...and children (array, possible empty, and currently redundant)
  handlePlatformFromTabBar(obj) {
    // Reset reference object:
    ConfigObject.metadata.platform = obj.parent;
    ConfigObject.metadata.subplatform = obj.child;
    // NOTE: comm'd out call that kicks off chart draw...
    this.updateSizes();
  }
  // FIELD PLATFORM FROM TAB BAR ends

  // UNPICK PLATFORMS
  // Called from getTabBarJSX to assemble the platform definitions to pass
  // down to the TabBar component
  unpickPlatforms() {
    // Get default platform and all platform nodes from lookup:
    const defaultPlatform = DefaultPreferences.metadata.defaults.platform;
    const defaultSubPlatform = DefaultPreferences.metadata.defaults.subplatform;
    // Result will be an array of platform definitions
    const result = [];
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
        Object.keys(obj.default.background.outerbox.dimensions).forEach((val) => {
          children.push(val);
        });
        // So we have an array of child names.
        // ( Platforms with no subplatform: children = ['default'] )
        tempObj.children = children;
        // Flag for default hightlight on tab bar
        tempObj.default = (key === defaultPlatform);
        result.push(tempObj);
      }
    });
    // Update CO with default values:
    ConfigObject.metadata.platform = defaultPlatform;
    ConfigObject.metadata.subplatform = defaultSubPlatform;
    return result;
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
    ConfigObject.metadata.type = evt.target.value;
    this.fieldUpdatedConfigObject();
  }

  // HANDLE LAYOUT SECTION CHANGE
  // Listener to change event on Section dropdown
  handleLayoutSectionChange(evt) {
    const newSection = evt.target.value;
    ConfigObject.metadata.section = newSection;
    // But I also need to reset subplatform to default
    // Array sets chain to look...
    const chain = [ 'background', 'outerbox', 'dimensions' ];
    const sectionNode = this.findPreferencesNode(ConfigObject.metadata.platform, newSection, chain);
    // Find default subplatform (width) node:
    // let defaultStr = 'default';
    // NOTE: Revisit this...
    let defaultStr = Object.keys(sectionNode).map((key) => {
      if (sectionNode[key].default) {
        defaultStr = key;
      }
      return defaultStr;
    });
    ConfigObject.metadata.subplatform = defaultStr;
    // for (let subC in sectionNode)
    this.fieldUpdatedConfigObject();
  }
  // HANDLE LAYOUT SECTION CHANGE ends

  // HANDLE LAYOUT PANEL CHANGE
  handleLayoutPanelChange(evt) {
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
    console.log(`${ targetId.toUpperCase() } set to ${ newVal }... am I doing anything with this?`);
    /* eslint-enable */
  }
  // HANDLE LAYOUT SIZE CHANGE ends

  // HANDLE LAYOUT BAR SPAN EVENT
  // Listener to the 'recommended height' button
  handleLayoutRecommendedHeightyEvent(event) {
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
    const sectionArray = DefaultPreferences.metadata.sections;
    const options = sectionArray.map((opt, index) => (
      <option key={index} value={opt.id}>{opt.display}</option>
    ));
    const defaultValue = DefaultPreferences.metadata.defaults.section;
    // Update the config object:
    ConfigObject.metadata.section = defaultValue;
    return (
      <p className="fold-form-p">
        <label className="fold-form-label"
          htmlFor="accordion-section-select"
        >
          Section
        </label>
        <select className="accordion-select"
          id="accordion-section-select"
          defaultValue={defaultValue}
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
    const defaultValue = DefaultPreferences.metadata.defaults.type;
    // Update the config object:
    ConfigObject.metadata.type = defaultValue;
    return (
      <p className="fold-form-p">
        <label className="fold-form-label"
          htmlFor="accordion-type-select"
        >
          Chart type
        </label>
        <select className="accordion-select"
          id="accordion-type-select"
          defaultValue={defaultValue}
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
  makeLayoutPanelFieldset() {
    // Get defaults from prefs
    const panelDefaults = DefaultPreferences.metadata.defaults.panels;
    const inputClass = 'layout-panels-fieldset-input';
    // Update pass to config object
    ConfigObject.metadata.panels = panelDefaults;
    return (
      <fieldset className="accordion-fieldset layout-panels-fieldset">
        <legend>Panels</legend>
        <p className="fold-form-p">
        <label htmlFor="panel-number-input">number:</label>
        <input
          type="number" id="panel-number-input"
          className={inputClass}
          defaultValue={panelDefaults.number}
          min="1" max={panelDefaults.total} ref="number"
          onBlur={this.handleLayoutPanelChange}
          required
        ></input>
        </p>
        <p className="fold-form-p">
        <label htmlFor="panel-total-input">of total:</label>
        <input
          type="number" id="panel-total-input"
          className={inputClass}
          defaultValue={panelDefaults.total}
          min="1" max="8" ref="total"
          onBlur={this.handleLayoutPanelChange}
          required
        ></input>
        </p>
        <p className="fold-form-p">
        <label htmlFor="panel-rows-input">on rows:</label>
        <input
          type="number" id="panel-rows-input"
          className={inputClass}
          defaultValue={panelDefaults.rows}
          min="1" max={panelDefaults.total} ref="rows"
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
  makeLayoutSizeFieldset() {
    const inputClass = 'layout-size-fieldset-input';
    // Get defaults from prefs
    // const panelDefaults = DefaultPreferences.metadata.defaults.panels;
    // Update pass to config object
    // NOTE:    ConfigObject.metadata.panels = panelDefaults;
    // (what was this...?)
    return (
      <fieldset className="accordion-fieldset layout-size-fieldset">
        <legend>Size</legend>
        <p className="fold-form-p">
          <label htmlFor="size-width-input">width:</label>
          <input
            type="number" id="size-width-input"
            className={inputClass}
            min="50" ref="width"
            onBlur={this.handleLayoutSizeChange}
            required
          ></input>
        </p>
        <p className="fold-form-p">
          <label htmlFor="size-height-input">height:</label>
          <input
            type="number" id="size-height-input"
            className={inputClass}
            min="50" ref="height"
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
    const unpickedPlatforms = this.unpickPlatforms();
    return (
      <div className="editor-header-wrapper">
         <div className="chart-platform-choices-div">
          <SilverTabBar
            tabBarDefinitions={unpickedPlatforms}
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
  render() {
    // Accordion structure...
    // NOTE: I could derive the fold ID names, below, from props definitions,
    // but sooner or later I hit inferential functions, so let's keep it crude and simple...
    const chartdataFoldJsx = this.makeFoldJsx('chartdata');
    const layoutFoldJsx = this.makeFoldJsx('layout');
    const scalesFoldJsx = this.makeFoldJsx('scales');
    // Header stretches across entire Sibyl window and contains
    // - Tab bar (dependent component) for platform choices
    // - Reset button (for now, at least...)
    const headerJsx = this.makeHeaderJsx();
    return (
      <div className="silverbullet-editor-wrapper">
        <div className="editor-outer-wrapper">
          <ul className="editor-accordion">
            {chartdataFoldJsx}
            {layoutFoldJsx}
            {scalesFoldJsx}
          </ul>
        </div>
        {headerJsx}
      </div>
    );
  }
}
