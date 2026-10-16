---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/theme-oren': patch
---

Rating: `required` работает — обязательная оценка, которую не поставили (0), не даёт отправить форму. У `input[type=range]` нет ни `required`, ни состояния «пусто», поэтому ошибку полю ставит новый плагин `TRatingValidityPlugin` (определение `RatingValidityPluginDescriptor`, namespace `validity`, в составе Rating) — `setCustomValidity` со строкой локали, пока оценка обязательна, равна 0 и не только для показа (`readonly`); поставили оценку — ошибки нет. Не отправить форму, поставить фокус на поле и показать сообщение — дальше браузер. Сообщение — новая строка локали `rating.required` во всех шести готовых локалях («Поставьте оценку», «Please select a rating»); своя полная локаль (`TLocale`) дописывает строку `rating.required` или собирается поверх готовой через `extendLocale`. Тема oren после неудачной отправки красит пустые звёзды вуалью цвета ошибки — по `:user-invalid` поля, поэтому нетронутая оценка до первой отправки не горит. ARIA не меняется: `aria-required` у роли `slider` нет.
