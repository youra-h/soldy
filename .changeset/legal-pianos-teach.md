---
'@soldy-ui/setup': patch
---

Слоты, которые были только в разметке Vue, объявлены в дескрипторах — с тем же scope, и `DescriptorSlots` отдаёт их с типами: Input — `leading` и `trailing` (`ctrl`), CheckBox — `icon` и `indeterminate-icon` (`value`, `indeterminate`), Switch — `on` и `off` (`value`, `ctrl`), Tabs.Item — `leading`, `trailing`, `close-icon` и scope `text`, `active` у слота по умолчанию, Accordion.Item — `leading-icon`, `leading`, `header` (`text`, `selected`), `trailing`, `trailing-icon` и панель в слоте по умолчанию, DragAndDrop — слот по умолчанию. Слот `clear` у Select объявляет свой scope — функцию `clear`. Имена слотов не изменились.
