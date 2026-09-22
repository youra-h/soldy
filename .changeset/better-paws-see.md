---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
---

Снятый из разметки проп возвращается к умолчанию и там, где умолчание — «не задано»: доступное имя (`aria_label`, `aria_labelledBy`, `aria_describedBy`), `width` и `height` у Icon, `trackBy` у коллекций и `anchor_anchor` у Frame. Имя пропадает, размер иконки снова даёт `size`, панель отвязывается от якоря. Раньше умолчание у этих пропсов не было объявлено, и во всех адаптерах компонент оставался с прежним значением. Во Vue отсутствующий `anchor_anchor` теперь `null`, а не `undefined`.
