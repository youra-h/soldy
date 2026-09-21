/**
 * Опции расширений drag-and-drop: лифт, по которому идёт флаг drag-контекста.
 */

import type { TElevatorFactory } from '../../../protected/adapter/elevator'

export interface IDragAndDropExtensionOptions {
	elevator: TElevatorFactory
}

export interface IDragAndDropCollectionExtensionOptions {
	elevator: TElevatorFactory
}
