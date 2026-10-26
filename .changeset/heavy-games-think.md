---
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/svelte': patch
'@soldy-ui/solid': patch
---

Lighter collection items and closers: Vue components pass changed props to the core before a parent-driven render instead of a watch over every prop (a Select page is 14% lighter, a button 10%); the close buttons of Tabs, Tags, Toasts, Popover, Dialog and Drawer are mounted only when shown instead of assembling a hidden button
