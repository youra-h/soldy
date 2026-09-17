/**
 * Опции расширений drag-and-drop: лифт, по которому идёт флаг drag-контекста.
 */

import type { TElevatorFactory } from '../../elevator'

export interface IDragAndDropExtensionOptions {
	elevator: TElevatorFactory
}

export interface IDragAndDropCollectionExtensionOptions {
	elevator: TElevatorFactory
}
