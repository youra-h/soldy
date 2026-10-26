---
'@soldy-ui/angular': patch
---

Popover and Menu.PopoverItem accept panel content as `<ng-template slot="default">`: with `lazyMount`, its components are created on first open instead of right away. Calendar creates its month and year picker on first open.
