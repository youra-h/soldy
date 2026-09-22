---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

RadioGroup: новый компонент «один из N» — `RadioGroup` и `RadioGroup.Item` (Vue). Радио — нативные `input[type=radio]` в корне-`label`: общий `name` раздаёт группа (без своего имени — от `uid`), одну остановку Tab, стрелки с пропуском выключенных и пробел даёт браузер, `aria-checked` и `aria-disabled` ядро не пишет. Значение группы — `v-model:value`, связанное с отмеченным радио; удаление отмеченного радио значение не стирает. `view`, `size` и `variant` задаются группе и раздаются каждому радио; тема oren рисует виды `dot` (точка в кольце, по умолчанию) и `ring` (утолщённое кольцо) по `data-selected` и `data-disabled` корня радио, у контейнера группы стилей нет. Текста у радио нет — подпись кладут слотом. В ядре появились базы фасадов под активацию — `TActivationCollectionFacade` и `TActivationItemFacade`; фасады Tabs переехали на них без изменения API.
