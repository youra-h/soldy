/**
 * Абстрактные ключи элеваторов и фабрика.
 *
 * Это единое пространство имён для всех фреймворков.
 * Конкретная реализация IContextElevator (VueElevator, React.Context, ...)
 * живёт в своём UI-пакете и передаётся сюда через TElevatorFactory.
 */

/** Родительская коллекция (ICollectionHost). Используется Tabs/ListBox + TabItem/ListItem. */
export const COLLECTION_ELEVATOR = 'soldy:collection'

/** Плагины коллекции (TCollectionItemPlugins registrar). */
export const COLLECTION_PLUGINS_ELEVATOR = 'soldy:collection-plugins'

/** Drag-and-drop контекст. DragAndDrop → Collection. */
export const DRAG_CONTEXT_ELEVATOR = 'soldy:drag-context'
