---
'@soldy-ui/theme-base': patch
'@soldy-ui/theme-oren': patch
---

The group labels of ListBox, Select and Menu now take the note of the size of their rows (Field helper), a step smaller than the rows, instead of the note one size below: 14px at a 16px place for `normal` rows, 12px at 14px. The variables `--so-group-label-font-size-sm` and `--so-group-label-line-height-sm` are gone: `sm` rows read the `sm` note.
