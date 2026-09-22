/**
 * Ключи элеваторов — единое пространство имён для всех фреймворков.
 *
 * Конкретная реализация IContextElevator (TVueElevator, React.Context, ...)
 * живёт в своём UI-пакете и передаётся сюда через TElevatorFactory.
 */

import type { TCollectionEngine } from '@soldy-ui/core'
import type { IElevatorKey, TCollectionItemRegister } from './types'

/** Родительская коллекция. Ребёнок толкает { instance, bundle } наверх. */
export const COLLECTION_ENGINE_ELEVATOR: IElevatorKey<TCollectionItemRegister> = {
	name: 'soldy:collection-engine',
}

/** Drag-and-drop контекст. DragAndDrop → Collection. */
export const DRAG_CONTEXT_ELEVATOR: IElevatorKey<boolean> = { name: 'soldy:drag-context' }

/** Контекст коллекции для дочернего элемента. Родитель → дочерний элемент. */
export const ITEM_CONTEXT_ELEVATOR: IElevatorKey<TCollectionEngine<any, any>> = {
	name: 'soldy:item-context',
}
