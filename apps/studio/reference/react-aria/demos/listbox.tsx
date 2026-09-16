// Adapter for the first official ListBox demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {selectionMode: 'multiple'};
  "use client";
  import {ListBox, ListBoxItem} from '../vendor/starters/docs/src/ListBox';

  export default function ReferenceDemo(){return (<ListBox aria-label="Favorite animal" {...INITIAL_PROPS}>
    <ListBoxItem>Aardvark</ListBoxItem>
    <ListBoxItem>Cat</ListBoxItem>
    <ListBoxItem>Dog</ListBoxItem>
    <ListBoxItem>Kangaroo</ListBoxItem>
    <ListBoxItem>Panda</ListBoxItem>
    <ListBoxItem>Snake</ListBoxItem>
  </ListBox>);}