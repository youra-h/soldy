---
'@soldy-ui/core': patch
---

Table: чекбокс строки живёт одно монтирование (acquireCheckBox / releaseCheckBox вместо checkBoxOf) — в режиме окна прокрученные строки не держат чекбоксы. TEventEmitter.off снимает пустой набор события вместе с последним обработчиком
