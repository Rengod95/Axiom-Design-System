// Adapter for the first official TagGroup demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {label: 'Categories', selectionMode: 'multiple'};
  "use client";
  import {TagGroup, Tag} from '../vendor/starters/docs/src/TagGroup';

  export default function ReferenceDemo(){return (<TagGroup {...INITIAL_PROPS}>
    <Tag>News</Tag>
    <Tag>Travel</Tag>
    <Tag>Gaming</Tag>
    <Tag>Shopping</Tag>
  </TagGroup>);}