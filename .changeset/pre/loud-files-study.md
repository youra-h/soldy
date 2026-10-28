---
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
---

React, Solid and Svelte: a part's click action (activate a tab, choose an option, toggle a section, press a menu item, turn a page, close a panel or a tag, clear a field, the DatePicker's Cancel and Done) is a native listener on the part's node, set as soon as the node exists, as in Vue, Web Components and Angular. The owner's `onActionClick` and `onActionPress` now come after the action: a handler that read the state before the click (the previous tab, the previous choice) reads the new one — take the previous value from the change event (`onChangeActivation`, `onChangeSelection`) instead. A click right after the mount, before the first frame, is no longer lost on the tabs' and tags' crosses and the fields' clear buttons. The consumer's `onClick` on a part still runs after the action.
