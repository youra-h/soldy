---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

Разделитель между секциями группировки включается свойством `groupSeparators` у ListBox, Select, Menu и `Menu.Submenu`. Ломающее: у ListBox и Select разделителя между группами по умолчанию больше нет — как вернуть: `groupSeparators` (`<ListBox group-separators>`, `groupSeparators={true}`). У Menu и подменю он по умолчанию есть, выключить — `groupSeparators: false`; ручной `Menu.Separator` свойство не трогает. Тема oren без разделителя оставляет его место пустым, и секции не слипаются.
