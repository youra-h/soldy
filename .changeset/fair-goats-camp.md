---
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
---

RadioGroup: выбор, отменённый в `item:activate:before`, больше не оставляет нажатое радио отмеченным, а соседа — без отметки: после каждого `change` поля группы возвращает к модели её плагин `TRadioGroupCheckedPlugin`. Повторный клик по радио, в выборе которого отказали, снова выбирает его.
