---
'@soldy-ui/solid': patch
---

Slider, Rating, ProgressLinear, Pagination и Scroller в Solid: ползунок с одной или несколькими ручками — метки, подсказка со значением, слоты `mark` и `thumb`; оценка звёздами — половинки, предпросмотр наведением, только для показа, обязательность, слот `icon`; индикатор выполнения линией; постраничная навигация — окно с пропусками, стрелки, движок снаружи, слоты `item`, `prev-icon` и `next-icon`; лента со стрелками — `viewportAria` и слоты значков. Ползунок и оценка берут связку поля формы `Field`, как Input. Сервер рисует их целиком: окно и текущую страницу, ручки, звёзды и значения полей. Базовые слои Interactive, ValueControl и InputControl — типы пропсов и `setupInteractive`, `setupValueControl`, `setupInputControl`, как у Control.
