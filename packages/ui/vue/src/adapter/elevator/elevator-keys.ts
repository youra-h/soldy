/**
 * Стандартные ключи для IContextElevator.
 *
 * Каждый ключ — это общий идентификатор, по которому родитель
 * и ребёнок находят друг друга через elevator.up()/down().
 */

/** Родительская коллекция (ICollectionHost). Используется Tabs/ListBox + TabItem/ListItem. */
export const COLLECTION_ELEVATOR = 'soldy:collection'

/** Плагины коллекции (TCollectionItemPlugins registrar). */
export const COLLECTION_PLUGINS_ELEVATOR = 'soldy:collection-plugins'

/** Drag-and-drop контекст. DragAndDrop → Collection. */
export const DRAG_CONTEXT_ELEVATOR = 'soldy:drag-context'
