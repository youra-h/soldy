---
'@soldy-ui/webc': minor
---

Web Components: уборка адаптерного слоя. Ломающее: база элемента переименована — SoldyElement → ElementBase, ISoldyElement → IElementBase, ISoldyElementSpec → IElementSpec, TSoldyElementClass → TElementClass, TSoldyElementProps → TElementProps. Описание корня — стратегией: { strategy: 'host', … } вместо флагов, { strategy: 'wrapped' } вместо { wrapped: true, control: true }, { strategy: 'wrapped', teleport } вместо { wrapped: true, teleport }. ITemplate.create(root, ctx) — без параметра hasSlot, он есть в ctx.hasSlot. У TBinding больше нет поля plugins. Удалены useAttributes (берите ключи buildAttributeMap) и тип TSlotGiven.
