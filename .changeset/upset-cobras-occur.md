---
'@soldy-ui/plugins': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/core': minor
---

Движение — один режим на библиотеку. По умолчанию всё движение компонентов следует настройке системы `prefers-reduced-motion`: при просьбе системы его нет у полосы Tabs `line`, выезда Drawer, бега ProgressLinear и ProgressSpinner, раскрытия Accordion, стрелки Select, ручки Switch, точки RadioGroup и волны Skeleton — так же, как раньше у карточки Tabs `contained`, ручек Slider и ленты Scroller. Приложение задаёт режим в точке входа — `useMotion('full')` (движение всегда) или `useMotion('reduce')` (никогда) из `@soldy-ui/plugins`; режим — атрибут `data-s-motion` на корне документа. Ломающее: без движения Drawer проявляется и гаснет на месте, а неизвестная доля индикаторов — медленное мерцание всей дорожки и всего кольца вместо бега; `scrollBehavior: 'smooth'` у ListBox и Select прокручивает сразу, когда движение убрано. Тема oren пишет движение одним миксином (`motion.allowed`); своя тема читает тот же атрибут.
