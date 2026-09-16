// Adapter for the first official CheckboxGroup demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {label: 'Email Notification Preferences'};
  "use client";
  import {CheckboxGroup} from '../vendor/starters/docs/src/CheckboxGroup';
  import {Checkbox} from '../vendor/starters/docs/src/Checkbox';

  export default function ReferenceDemo(){return (<CheckboxGroup {...INITIAL_PROPS}>
    <Checkbox
      value="product"
      description="Get notified about new features and improvements">
      Product Updates
    </Checkbox>
    <Checkbox
      value="security"
      description="Important notifications about your account safety">
      Security Alerts
    </Checkbox>
    <Checkbox
      value="marketing"
      description="Receive promotions, offers, and newsletters">
      Marketing Emails
    </Checkbox>
  </CheckboxGroup>);}