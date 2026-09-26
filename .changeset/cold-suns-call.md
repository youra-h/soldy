---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Drawer: новый компонент (Vue) — выезжающая панель у края экрана, модальная, как окно. Край — `placement`: `end` (по умолчанию), `start`, `top`, `bottom`, стороны логические; размер — `width` у боковой и `height` у верхней и нижней (переменные темы `--drawer-width` и `--drawer-height`). `swipe` включает жест: `handle` — смахнуть за полосу у края, `panel` — за любое место, кроме контролов и прокручиваемых областей; отпустили дальше четверти размера или быстро к краю — закрытие с новой причиной `swipe` (`TCloseReason`) через отменяемое `close:before`, иначе панель возвращается на место. `contained` оставляет панель в ближайшем позиционированном предке — например, в модальном окне — и не запирает прокрутку документа. Крестик, Escape, подложка, `dismissible`, `close:before`, фокус и немой для скринридера фон — как у Dialog: общее вынесено в базу `TModalLayer` (`@soldy-ui/core`), дескриптор `ModalLayerDescriptor` (`@soldy-ui/setup`) и расчёт раскладки `TModalLayoutPlugin` (`@soldy-ui/plugins`), у Dialog поведение и CSS прежние. Тема oren рисует панель и подложку (`.s-drawer`, `.s-drawer__backdrop`, `--placement-*`, `data-open`, `data-swiping`, `data-contained`), въезд и выезд — переходом.
