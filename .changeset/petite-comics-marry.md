---
'@soldy-ui/core': minor
---

Убран TStateUnit и внедрение состояний: свойства компонентов — поля класса. Удалены TStateUnit, IStateUnit, TVisibilityState, IVisibilityState, TStateCtor, свойство states, опция конструктора states, третий параметр типа TStates и типы T\*States. Своя логика свойства — подписка на отменяемое событие change:<x>:before (TChangeEvent: поправить e.value или e.preventDefault()) у rendered, size, variant, disabled, focused, value, text, closable и unavailable, или наследник через ctrl; одна логика на много компонентов — плагин в реестре на базовом классе (usePlugins). Видимость расширяют show:before и hide:before. Удалены bindDisabledToOwner, notifyOwnerDisabled, bindStyleToOwner, notifyOwnerSize и notifyOwnerVariant: расширение коллекции пишет элементам size и variant владельца, а его disabled распространяется на элементы, как у fieldset, — включение владельца включает и элемент, выключенный сам по себе.
