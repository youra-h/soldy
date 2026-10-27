---
'@soldy-ui/theme-base': patch
'@soldy-ui/theme-oren': patch
---

Every size of the font scales now steps from the font of the place, which `normal` takes as is, instead of numbers fitted to a 16px page. Button, Pagination, fields and captions: `sm` is 2px smaller, `lg`, `xl` and `2xl` 2px, 4px and 8px larger (`calc(1em - 0.125rem)` … `calc(1em + 0.5rem)`). Table cells and header labels, Calendar day numbers and picker tiles, control notes (Field helper and error, Textarea counter, Slider mark labels) and tags are the same ladder a step down: 4px and 2px smaller at `sm` and `normal`, the font of the place at `lg`, 2px and 4px larger at `xl` and `2xl`; the group labels of `sm` rows are 6px smaller. At a 16px place nothing changes; at 14px a `sm` Button is now 12px instead of 14px (as large as `normal`), a `lg` one 16px instead of 18px, and a `normal` table 12px. The gap cell of Pagination takes the font of its size on its own node rather than inheriting it from the root.
