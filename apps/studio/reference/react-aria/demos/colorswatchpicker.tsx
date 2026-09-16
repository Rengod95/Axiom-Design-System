// Adapter for the first official ColorSwatchPicker demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {'aria-label': 'Background color'};
  "use client";
  import {ColorSwatchPicker, ColorSwatchPickerItem} from '../vendor/starters/docs/src/ColorSwatchPicker';

  export default function ReferenceDemo(){return (<ColorSwatchPicker {...INITIAL_PROPS}>
    <ColorSwatchPickerItem color="#A00" />
    <ColorSwatchPickerItem color="#f80" />
    <ColorSwatchPickerItem color="#080" />
    <ColorSwatchPickerItem color="#08f" />
    <ColorSwatchPickerItem color="#088" />
    <ColorSwatchPickerItem color="#008" />
  </ColorSwatchPicker>);}