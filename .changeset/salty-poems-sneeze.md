---
'@soldy-ui/theme-oren': patch
---

Тема oren больше не выпускает в `dist/index.css` глобальные утилиты, которые сканер Tailwind находил в текстах пакета — типах, документации и тестах: `.relative`, `.block`, `.inline`, `.rounded`, `.border-s`, `.border-e`, `.bg-neutral-400`, `.bg-rose-500`, `.bg-s-component-surface`, `.bg-s-neutral-100`, `.bg-white`, `.text-white`, `.shadow-sm/md`, `.ring`, `.outline`, `.outline-none`. Такой класс в разметке приложения получал стили темы. Поиск классов Tailwind в теме выключен, стили компонентов не изменились.
