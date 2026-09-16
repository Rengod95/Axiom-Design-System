// Adapter for the first official PreviewTrigger demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {};
  "use client";
  import {PreviewTrigger} from 'react-aria-components/PreviewTrigger';
  import {Popover} from '../vendor/starters/docs/src/Popover';
  import {Link} from '../vendor/starters/docs/src/Link';
  import {Button} from '../vendor/starters/docs/src/Button';

  function ProfilePreview({handle, name, bio, avatar, href, ...popoverProps}) {
    return (
      <PreviewTrigger>
        <Link href={href}>@{handle}</Link>
        <Popover style={{width: 280}} {...popoverProps}>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <img alt="" src={avatar} style={{width: 40, height: 40, borderRadius: '50%'}} />
            <div style={{minWidth: 0}}>
              <div style={{fontWeight: 600, fontSize: 'var(--font-size)'}}>{name}</div>
              <div style={{fontSize: 'var(--font-size-sm)'}}>@{handle}</div>
            </div>
            <Button style={{marginLeft: 'auto'}} variant="secondary">Follow</Button>
          </div>
          <div style={{fontSize: 'var(--font-size)', marginTop: 12}}>{bio}</div>
        </Popover>
      </PreviewTrigger>
    );
  }

  function Example(props) {
    return (
      <p style={{maxWidth: 480}}>
        Just shipped a new release with help from{' '}
        <ProfilePreview
          handle="mayachen"
          name="Maya Chen"
          bio="UI engineer, accessibility advocate, and component library enthusiast."
          avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          href="#"
          {...props} />
        {' '}and{' '}
        <ProfilePreview
          handle="cwebb"
          name="Charles Webb"
          bio="Design systems, docs, and developer experience."
          avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80"
          href="#"
          {...props} />
        !
      </p>
    );
  }
export default function ReferenceDemo(){return <Example {...INITIAL_PROPS} />;}
