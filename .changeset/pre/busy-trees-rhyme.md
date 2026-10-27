---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/plugins': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/angular': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/webc': minor
---

Menu, its submenus and DatePicker build their panel content on the first opening (`contentRendered`): a menu nobody opened is its trigger and an empty panel, a date picker nobody opened is a field with a button. Closing still only hides the panel and keeps the content. In Angular, menu items written in markup are a projection — Angular creates them with the menu and only inserts them on the first opening; items from `items` and the calendar are created then.

What broke and how to update: before the first opening, menu items and the DatePicker calendar are neither in the document nor in the menu's collection. Code that reads them earlier should open the panel first (`open`). Opening the menu by a key still highlights the edge item — a frame later, once the items are drawn.
