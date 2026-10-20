/**
 * Опции расширений drag-and-drop: лифт, по которому обёртка идёт к коллекциям.
 */

import type { TElevatorFactory } from '../../../protected/adapter/elevator'

export interface IDragAndDropExtensionOptions {
	elevator: TElevatorFactory
}

export interface IDragAndDropCollectionExtensionOptions {
	elevator: TElevatorFactory
}
