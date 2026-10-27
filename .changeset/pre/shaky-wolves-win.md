---
'@soldy-ui/angular': patch
---

Menu and Menu.Submenu accept their items as `<ng-template slot="default">`: the menu creates the template with the first opening of its panel, while items written as a projection Angular creates together with the menu.
