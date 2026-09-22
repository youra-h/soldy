---
'@soldy-ui/setup': minor
---

Типы дескриптора больше не пишутся руками: `defineComponent({ … })` выводит пропсы и события из класса ядра (`ctor`, без него — от `extends`), слоты — из объявления `slots`. Curried-форма `defineComponent<TProps, TEvents, TSlots>()({ … })` удалена: опции передаются сразу, без type-аргументов. `TResolveInstance` удалён, параметры `IComponentDefinitionOptions` перестроены под вывод.

Типы-зеркала слотов (`TButtonSlots` и ещё 12) из экспорта удалены: тип слотов — `DescriptorSlots<typeof ButtonDescriptor>`. Значение scope слота задаётся через `defineType<T>(ctor)`, голый конструктор (`String`) не компилируется. В типах адаптеров появились объявленные, но пропущенные зеркалами слоты: унаследованный `default` у наследников без своего объявления (Frame, Icon, Input и другие), `close-icon` у TagsItem, `indicator-icon` у ListBoxItem, `item`, `item-leading` и `item-trailing` у Tabs и Select. У `ValueControlDescriptor` и `InputControlDescriptor` тип значения — `unknown` (было `any` и `string`): у дженерик-класса выводится констрейнт параметра.
