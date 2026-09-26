---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/react': patch
'@soldy-ui/vue': patch
---

Автоматические id в разметке (поле, панели, связки табов и секций, список Select, name группы радио, data-owner) строятся от основы экземпляра idBase, а не от счётчика uid: адаптеры Vue и React дают её из useId, и при серверном рендере id на сервере и в браузере совпадают. Новая опция конструктора idBase; элементы коллекции из items получают основу владельца с номером. В React фабрика useAdapterContext получает функцию сборки create — компонентам собирать контекст ею.
