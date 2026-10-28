---
'@soldy-ui/react': patch
'@soldy-ui/vue': patch
---

Collection items no longer re-render with their owner. In React every collection item (the `*/item` parts and the menu items) stands under the render boundary, as Table's rows do; in Vue an owner that draws its items from data relays its `item*` slots to them only when it has any. Opening DatePicker no longer redraws every day of the month, opening Select every option.
