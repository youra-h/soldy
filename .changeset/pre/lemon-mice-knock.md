---
'@soldy-ui/angular': minor
---

Адаптер Angular: корень компонента разобран на стратегии (runtime/root/), раскладка и перенос атрибутов — общими помощниками, комментарии сокращены. Сломалось: у TBinding нет поля plugins — Angular его не читал; если код потребителя брал binding.plugins, берите набор у контекста (adapter.bundle). Тип TToastRender по-прежнему экспортируется, модуль toasts/types удалён.
