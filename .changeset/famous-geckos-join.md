---
'@soldy-ui/react': patch
---

В React появились ProgressLinear, Slider, Rating, Pagination и Scroller — с той же разметкой и тем же поведением, что во Vue, — и базовые слои Interactive, ValueControl и InputControl (типы пропсов и хуки `useSetupInteractive`, `useSetupValueControl`, `useSetupInputControl`). Значение ползунков Slider и Rating ведёт поле адаптера `NativeInput`: `live.value` принимает и число, в узел оно уходит строкой.
