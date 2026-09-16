// Adapter for the first official Toolbar demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {'aria-label': 'Text formatting'};
  "use client";
  import {Toolbar} from '../vendor/starters/docs/src/Toolbar';
  import {ToggleButtonGroup} from '../vendor/starters/docs/src/ToggleButtonGroup';
  import {ToggleButton} from '../vendor/starters/docs/src/ToggleButton';
  import {Button} from '../vendor/starters/docs/src/Button';
  import {Select, SelectItem} from '../vendor/starters/docs/src/Select';
  import {Separator} from '../vendor/starters/docs/src/Separator';
  import {Group} from 'react-aria-components/Group';
  import {Bold, Italic, Underline, ClipboardCopy, Scissors, ClipboardPaste} from 'lucide-react';

  export default function ReferenceDemo(){return (<Toolbar {...INITIAL_PROPS}>
    <ToggleButtonGroup aria-label="Style">
      <ToggleButton id="bold" aria-label="Bold">
        <Bold size={16} />
      </ToggleButton>
      <ToggleButton id="italic" aria-label="Italic">
        <Italic size={16} />
      </ToggleButton>
      <ToggleButton id="underline" aria-label="Underline">
        <Underline size={16} />
      </ToggleButton>
    </ToggleButtonGroup>
    <Separator />
    <Group aria-label="Clipboard">
      <Button aria-label="Copy">
        <ClipboardCopy size={16} />
      </Button>
      <Button aria-label="Cut">
        <Scissors size={16} />
      </Button>
      <Button aria-label="Paste">
        <ClipboardPaste size={16} />
      </Button>
    </Group>
    <Separator />
    <Select aria-label="Font" defaultSelectedKey="helvetica">
      <SelectItem id="helvetica">Helvetica</SelectItem>
      <SelectItem id="times">Times</SelectItem>
      <SelectItem id="comic-sans">Comic Sans</SelectItem>
    </Select>
  </Toolbar>);}