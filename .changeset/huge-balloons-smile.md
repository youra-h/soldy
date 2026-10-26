---
'@soldy-ui/angular': patch
---

Tabs.Content accepts its content as `<ng-template slot="default">`: an inactive panel then creates nothing, and leaving the tab removes it.
