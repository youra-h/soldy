---
'@soldy-ui/plugins': patch
'@soldy-ui/core': patch
'@soldy-ui/vue': patch
---

TAnchorPlugin: `anchor_placement` принимает `top` и `bottom` — панель по центру якоря, сверху или снизу. Flip меняет только сторону и центр сохраняет, shift у края окна сдвигает панель, как и прежде, а направление письма центр не разворачивает. В `data-placement` у центра — сторона без суффикса (`top`, `bottom`). Те же значения принимает `placement` у Tooltip, и по умолчанию подсказка стоит по центру над триггером (`top`), как у Radix и Zag.
