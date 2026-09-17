---
'@soldy/core': patch
'@soldy/plugins': patch
'@soldy/setup': patch
'@soldy/ui-vue': patch
---

Tabs: клавиатура по паттерну APG Tabs. Стрелки по оси ориентации и Home/End переносят фокус и сразу активируют таб, Delete закрывает таб, который можно закрыть. Весь список — одна остановка Tab: tabindex="0" у активного таба, следующая остановка — панель, кнопка закрытия из порядка Tab выведена. Список табов объявляет aria-orientation и получает имя из aria_label.
