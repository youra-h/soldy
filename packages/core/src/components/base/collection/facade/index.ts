// Фасады (defineComponent-совместимые обёртки коллекции и элемента)
export { TCollectionComponent } from './collection-component.class'
export { TCollectionItemComponent } from './collection-item-component.class'
export * from './types'
// Базы по расширениям. Иерархия повторяет состав расширений, а не таксономию
// компонентов: нет расширения — нельзя наследовать (сужение дженерика).
export * from './batch'
export * from './order'
export * from './selection'
