// Adapter for the first official Virtualizer demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {rowSize: 32, gap: 4, padding: 4};
"use client";
import {Virtualizer, ListLayout} from 'react-aria-components/Virtualizer';
import {ListBox, ListBoxItem} from '../vendor/starters/docs/src/ListBox';

let items: {id: number, name: string}[] = [];
for (let i = 0; i < 5000; i++) {
  items.push({id: i, name: `Item ${i}`});
}

export default function ReferenceDemo(){return (<Virtualizer
  /*- begin focus -*/
  layout={ListLayout}
  layoutOptions={INITIAL_PROPS}
>
  {/*- end focus -*/}
  <ListBox
    aria-label="Virtualized ListBox"
    selectionMode="multiple"
    items={items}
    style={{display: 'block', padding: 0}}>
    {item => <ListBoxItem style={{height: '100%', minHeight: 0}}>{item.name}</ListBoxItem>}
  </ListBox>
</Virtualizer>);}