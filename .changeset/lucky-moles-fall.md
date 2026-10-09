---
'@soldy-ui/angular': minor
---

Angular: эмиттер выхода заводится при первом чтении выхода — привязкой в шаблоне или подпиской из кода, — а не на каждый выход заранее в конструкторе: компонент, на чьи выходы никто не подписан, больше не держит по эмиттеру на выход (у кнопки их 36). Выход в `T<Имя>Surface` теперь геттер прежнего типа `TOutputEmitter`, события ядра уходят только в заведённые эмиттеры, а `outputToObservable` по выходу по-прежнему завершается вместе с компонентом. Ломающее для своих компонентов на `TComponentBase`: конструктор принимает `(inputNames, rootStrategy?)` без имён выходов — вместо `super(ButtonInputNames, ButtonOutputNames)` пишите `super(ButtonInputNames)`, вместо `super(ComponentViewInputNames, ComponentViewOutputNames, 'host')` — `super(ComponentViewInputNames, 'host')`; `TBinding.syncEvents` принимает поиск эмиттера по имени выхода `(name) => EventEmitter | undefined` вместо записи эмиттеров.
