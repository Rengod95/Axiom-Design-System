// Adapter for the first official Form demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {};
  "use client";
  import {Form} from '../vendor/starters/docs/src/Form';
  import {TextField} from '../vendor/starters/docs/src/TextField';
  import {Button} from '../vendor/starters/docs/src/Button';

  export default function ReferenceDemo(){return (<Form {...INITIAL_PROPS}>
    <TextField label="Name" name="name" isRequired placeholder="Enter your full name" />
    <TextField label="Email" name="email" type="email" isRequired placeholder="Enter your email" />
    <div style={{display: 'flex', gap: 8}}>
      <Button type="submit">Submit</Button>
      <Button type="reset" variant="secondary">Reset</Button>
    </div>
  </Form>);}