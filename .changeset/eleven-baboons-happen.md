---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/theme-oren': patch
---

Открытость слоя для темы — `data-open` у панели любого Frame: слой (`TLayer`) пишет его сам, проекцией `visible`, и проводки в разметке не нужно. Тема oren проявляет и гасит по нему панели Select и DatePicker на месте, как Popover у триггера без жеста: одна прозрачность его временем, а закрытая панель, пока гаснет, нажатий не ловит. У Popover `data-open` панели теперь пишет её Frame, а из набора `panelDataset` он ушёл; у Dialog и Drawer атрибут прежний.
