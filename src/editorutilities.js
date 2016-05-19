/*    In a bid for structural coherence, I've moved all the Editor's
      untility functions into this file. In theory, this leaves me
      able to see the basic functionality of the Editor...
      Working functions here are:
      - validatePanelValues
      - getScaleMinMaxIncr

      (There are also a number of commented out 'dead' functions)
*/


// VALIDATE PANEL VALUES
// Checks that any value entered in one of the panel inputs is
// consistent with existing values. Args are: id of the input, its new value,
// and the config object
// NOTE: this needs more work. Among other things, if input is 'total' I
// ought always be able to reset it, but 'number' and 'row' should adapt
// if inconsistent...
export function validatePanelValues(targetId, val, inPanels) {
  // Clone current CO panel properties & substitute potential new value
  // then run checks...
  const panels = Object.assign({}, inPanels);
  for (const key in panels) {
    if (key === targetId) {
      panels[targetId] = val;
    }
  }
  // Panel number can't exceed total
  if (panels.number > panels.total) {
    return false;
  }
  // Row count must be exact divisor of total
  if (panels.total % panels.rows !== 0) {
    return false;
  }
  // Can't have more rows than total
  if (panels.rows > panels.total) {
    return false;
  }
  // NOTE: anything else to check...?
  // Still here? New val is OK
  return true;
}
// VALIDATE PANEL VALUES ends

// MIN MAX OBJECT
// Passed 4 args: actual min val; actual max val; ideal number of increment-steps;
// and the lookup array of plausible increments
// Returns obj with 4 properties: min, max, increment and an updated step-count
export function getScaleMinMaxIncr(minVal, maxVal, stepNo, plausibleIncrs) {
  const mmObj = {};
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


// GET FORM JSX
// Called from render to assemble the editor form...
/*
export function getFormJsx() {
  return (
    <form id="json-editor">
      <select className="editor-style-select" defaultValue="br"
        onChange={this.catchStyleChange.bind(this)}
      >
        <option value="br">Britain</option>
        <option value="fn">Finance</option>
        <option value="ld">Leader</option>
      </select>
    </form>
  );
}
*/
// GET FORM JSX ends


// BAR CHART STUFF:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

// GET CHART INNER-BOX HEIGHT
// Called from componentDidMount; param is the validated config object.
// (A) If this is a bar chart, calls getBarChartHeight to calculate innerbox height
// and consequent overall chart height, which it displays as the recommended chart outer
// height (based on number of bars)...
// NOTE: I'll have to catch stacked and overlapping bars eventually...
// (B) For other styles, it would *probably* (remains to be decided) just derive
// innerbox height from overall height...
// In either case, returns innerbox height
/*
export function getChartInnerboxHeight(config) {
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
*/
// GET CHART INNER-BOX HEIGHT ends

// GET BAR CHART HEIGHT
// Some styles -- well, bar charts, anyway -- force the chart height
// Param is the validated config object
/*
export function getBarChartHeight(config) {
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

  // if (chartStyle.search('overlap') >= 0) {
  //   innerBoxHeight -= clusterHeight;
  //   innerBoxHeight -= ((clusterHeight / 2) * (seriesCount - 1));
  // }

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
*/
// .innerHeight and .outerHeight
// GET BAR CHART HEIGHT ends


//
// Below here is 'spare stuff' deleted from index.es6

/* eslint-disable id-match */
/* eslint-disable no-undef */
/* eslint-disable no-console */
/* eslint-disable camelcase */

/* From componentDidMount
this.schemaObj = {};
this.schemaObj.schema = EditorSchema;
// 2 options disable unwanted user access:
this.schemaObj.disable_edit_json = true;
this.schemaObj.disable_properties = true;
// Initialise editor form:
// JSONEditor.defaults.options.theme = 'foundation5';
// JSONEditor.defaults.options.theme = 'bootstrap2';
this.editorForm = new JSONEditor(document.getElementById('json-editor'), this.schemaObj);
// Remove the root 'Collapse' button:
this.editorForm.getEditor('root').toggle_button.remove();
// Intercept tabs in raw data text area, to prevent default focus-shift...
const textarea = document.querySelectorAll('.form-control textarea')[0];
textarea.onkeydown = this.catchTabEvent.bind(this);
textarea.onpaste = this.catchTextAreaPasteEvent.bind(this);

// Intercept column-count change:
// const columnDropDown = document.querySelectorAll('.form-control select')[0];
// columnDropDown.onchange = this.catchColumnEvent.bind(this);
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
      // Update the config object with 'ideal' inner box height
      // Display recommended height (if bar chart):
      // unpickedConfig.dimensions.innerbox.recommendedHeight = this.getChartInnerboxHeight(unpickedConfig);

      // Replaces (just a rename, but now returns a values):
      // this.showBarHeightRecommendation(unpickedConfig);
      console.log(unpickedConfig);
      // And pass the config object back to SilverBullet:
      this.passConfigToSibyl(unpickedConfig);
    } else {
      console.log('Invalid data: details to be enumerated eventually...');
    }
  } else {
    console.log('Invalid data: check form for details...');
  }
});
// Explicitly update editorForm from the default schema...
// NOTE: At present I set up column width dropdown items in 2 places,
// the schema and the operations lookup. Can I combine them -- ideally,
// refer only to operations...?
this.setDynamicSchemaVals();
*/


/*
The original form jsx constructor:
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
*/

/*
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
*/
