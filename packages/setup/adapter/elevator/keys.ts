/**
 * Абстрактные ключи элеваторов и фабрика.
 *
 * Это единое пространство имён для всех фреймворков.
 * Конкретная реализация IContextElevator (TVueElevator, React.Context, ...)
 * живёт в своём UI-пакете и передаётся сюда через TElevatorFactory.
 */

/** Родительская коллекция. Ребёнок толкает { instance, bundle } наверх. */
export const COLLECTION_ELEVATOR = 'soldy:collection'

/** Drag-and-drop контекст. DragAndDrop → Collection. */
export const DRAG_CONTEXT_ELEVATOR = 'soldy:drag-context'

/** Контекст коллекции для дочернего элемента. Родитель → дочерний элемент. */
export const ITEM_CONTEXT_ELEVATOR = 'soldy:item-context'
