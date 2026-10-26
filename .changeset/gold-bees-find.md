---
'@soldy-ui/core': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/webc': minor
---

DatePicker no longer builds its calendar up front: days and month pickers appear on the first opening, and date fields are created for the mode that needs them, so a closed picker holds just its field. Until the first opening or a mode change `ctrl.engine` has no calendar (`engine.options.get('owner')` is `undefined`) and commands such as `selection.chooseDate()` do nothing — open the picker (`ctrl.open = true`) before driving its calendar from code.
