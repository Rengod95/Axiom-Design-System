// Adapter for the first official TokenField demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {label: 'Message', allowsNewlines: true};
  "use client";
  import {Token, TokenField} from '../vendor/starters/docs/src/TokenField';
  import {TokenizingFieldValue} from '../vendor/packages/dev/s2-docs/pages/react-aria/TokenizingFieldValue';

  export default function ReferenceDemo(){return (<TokenField
     {...INITIAL_PROPS}
    defaultValue={TokenizingFieldValue.tokenize(
      'This example automatically tokenizes #hashtags and @usernames in the text.',
      /(?<=[\s\u200B]|^)[#@][^\s\u200B]+(?=[\s\u200B])/g
    )}>
    {segment => <Token>{segment.text}</Token>}
  </TokenField>);}