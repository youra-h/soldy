---
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/theme-oren': patch
---

Слоты элементов коллекций пробрасываются целиком: владелец, который рисует элементы из `items`, отдаёт каждый слот элемента как `item-<слот>`, и scope проброса — scope слота элемента плюс сам элемент. `item` у ListBox, Select, Tags и Accordion получает `{ item, text, selected }`, у Tabs — `{ item, text, active }`, у RadioGroup — `{ item, active }`, у Calendar и DatePicker — `{ item, text }`; `header` у Table — `{ column, text, sortable }`. Новые слоты — `item-indicator-icon` у ListBox и Select, `item-close-icon` у Tabs и Tags, `item-leading-icon` и `item-trailing-icon` у Accordion: иконку подменяют одному элементу условием по `item.value`. У ListBox появился слот `empty` — пока элементов нет, как у Select. Подпись `RadioGroup.Item` получает `{ active }`. Стрелку Accordion, подменённую слотом, тема oren поворачивает так же, как стрелку по умолчанию: класс `s-accordion-item__arrow` переехал с иконки на обёртку слота, а пустую обёртку тема прячет. В React владелец отдаёт элементу функцию слота (`relaySlot`), а не готовый узел.
