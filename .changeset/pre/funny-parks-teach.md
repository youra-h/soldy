---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/angular': patch
---

Menu: контекстное меню — режим `openOn: 'contextmenu'` (`open-on="contextmenu"` во Vue). Меню открывают правая кнопка, долгое касание, клавиша контекстного меню и Shift+F10 над областью в слоте `trigger`, и панель встаёт у точки вызова (`point`); у области нет связки кнопки — `triggerAria` пуст. У Frame новый вход `anchor_point`: точка в координатах окна вместо якоря, главнее него, пока задана.
