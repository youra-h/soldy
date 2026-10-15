---
'@soldy-ui/plugins': minor
'@soldy-ui/theme-oren': minor
---

Атрибут режима движения на корне документа назван по схеме `so-`, как классы: `data-s-motion` — теперь `data-so-motion` (`useMotion('reduce')` ставит `<html data-so-motion="reduce">`). Приложение, которое ставит атрибут само — в шаблоне серверной страницы — или читает его в своей теме и тестах, переименовывает его: старого имени `useMotion` не пишет, а тема oren не читает. Тема oren назвала по той же схеме кадры анимаций заглушки Skeleton: `skeleton-pulse` и `skeleton-wave` — теперь `so-skeleton-pulse` и `so-skeleton-wave`, и одноимённые кадры приложения их больше не подменяют.
