---
'@soldy-ui/angular': patch
---

Angular: значение входа в строгом шаблоне приложения сверяется с типом пропа. Раньше входы компонентов были объявлены только именами, и шаблон со `strictTemplates` пропускал любое значение: число в `[text]`, размер, которого нет, вид, которого тема не объявила. Теперь это ошибки компиляции шаблона — как и `<soldy-button disabled>` без значения: атрибут отдаёт входу пустую строку, а не `true`, пишите `[disabled]="true"`. Входы и выходы объявляет сгенерированная директива `T<Имя>Surface` (`TButtonSurface`, `TComponentViewSurface`, `TComponentSurface`; для своего компонента на дескрипторах Stylable, Control и Textable — `TStylableSurface`, `TControlSurface`, `TTextableSurface`), а `@Component` компонентов их больше не перечисляет. Тип входа — `TInputValue`: тип пропа дескриптора по имени входа.
