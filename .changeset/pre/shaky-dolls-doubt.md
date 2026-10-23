---
'@soldy-ui/solid': minor
---

Адаптер Solid: удержание в окнах гидратации — один помощник createHeldMemo на раскладку, ветки и петли; комментарии сокращены до шапок со ссылкой на packages/ui/solid/AGENTS.md. Сломалось: у TBinding нет поля plugins — набор берите у контекста (adapter.bundle); useCollectionAdapter(adapter, props, owner) принимает связку компонента вместо её forwardProps и отдаёт слитую связку (состояние обоих — joinState, ctrl и ref — компонента), тип TCollectionBinding заменён на TJoinedBinding.
