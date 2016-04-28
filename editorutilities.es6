/*    In a bid for structural coherence, I've moved all the Editor's
      untility functions into this file. In theory, this leaves me
      able to see the basic functionality of the Editor...
      Functions here are:
  getScaleMinMaxIncr
  unpickConfig

*/


// GET FORM JSX
// Called from render to assemble the editor form...
export function getFormJSX() {
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
// GET FORM JSX ends

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
