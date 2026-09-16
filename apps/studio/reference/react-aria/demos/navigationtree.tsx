// Adapter for the first official NavigationTree demo. Original MDX and component files remain verbatim in vendor/.
const INITIAL_PROPS = {};
  "use client";
  import {NavigationTree, NavigationTreeItem, NavigationTreeItemContent, NavigationTreeItemLink} from '../vendor/starters/docs/src/NavigationTree';
  import {Button} from '../vendor/starters/docs/src/Button';
  import {MoreHorizontal} from 'lucide-react';
  import {Router, Link as RouterLink} from '../vendor/packages/dev/s2-docs/pages/react-aria/Router';

  export default function ReferenceDemo(){return (<Router defaultSelectedRoute="/photos">
    {({selectedRoute}) => (
      <NavigationTree aria-label="Files" selectedRoute={selectedRoute} renderLink={props => <RouterLink {...props} />} defaultExpandedKeys={['files']}>
        <NavigationTreeItem id="home" href="/home" textValue="Home">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Home</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
        </NavigationTreeItem>
        <NavigationTreeItem id="files" href="/files" textValue="Files">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Files</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
          <NavigationTreeItem id="photos" href="/photos" textValue="Photos">
            <NavigationTreeItemContent>
              <NavigationTreeItemLink>Photos</NavigationTreeItemLink>
              <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
            </NavigationTreeItemContent>
          </NavigationTreeItem>
          <NavigationTreeItem id="videos" href="/videos" textValue="Videos">
            <NavigationTreeItemContent>
              <NavigationTreeItemLink>Videos</NavigationTreeItemLink>
              <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
            </NavigationTreeItemContent>
          </NavigationTreeItem>
        </NavigationTreeItem>
        <NavigationTreeItem id="shared" textValue="Shared">
          <NavigationTreeItemContent>
            <NavigationTreeItemLink>Shared</NavigationTreeItemLink>
            <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
          </NavigationTreeItemContent>
          <NavigationTreeItem id="food" href="/food" textValue="Food">
            <NavigationTreeItemContent>
              <NavigationTreeItemLink>Food</NavigationTreeItemLink>
              <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
            </NavigationTreeItemContent>
          </NavigationTreeItem>
          <NavigationTreeItem id="drinks" href="/drinks" textValue="Drinks">
            <NavigationTreeItemContent>
              <NavigationTreeItemLink>Drinks</NavigationTreeItemLink>
              <Button variant="quiet" aria-label="More options"><MoreHorizontal size={16} aria-hidden /></Button>
            </NavigationTreeItemContent>
          </NavigationTreeItem>
        </NavigationTreeItem>
      </NavigationTree>
    )}
  </Router>);}