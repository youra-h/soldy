---
'@soldy-ui/webc': minor
---

Web Components: уборка компонентов. Ломающее: в описании элемента descriptor, facade и ownerFacade — функции дескрипторов (descriptor: ButtonDescriptor), а не их результат. createDetail(owner, TButtonElement, { embedded, attributes }) и createItem(owner, TTabsItemElement) принимают класс элемента вместо тега, имени is и защиты: имя и тег класс получает при defineElement. Новое: у класса элемента — проверка с полным типом TButtonElement.is(node), типы TElementClassOf, TElementOf и TElementType (тип элемента класса), помощник patch(el, { size, disabled }) — запись только сменившихся свойств.
