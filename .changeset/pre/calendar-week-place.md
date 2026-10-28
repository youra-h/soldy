---
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
'@soldy-ui/angular': patch
'@soldy-ui/webc': patch
---

Calendar: weeks are keyed by their place in the grid, so switching to a language with another first day of the week keeps six days of seven in their row instead of rebuilding the month.
