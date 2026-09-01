import { defineComponent } from '../../base'
import { CollectionContribution } from '../../../contributions'

/**
 * Базовый дескриптор владельца коллекции.
 * Содержит общие props/events (items, trackBy + engine-события).
 * Конкретные коллекции (Tabs, Collapse, ...) наследуют его через `extends`.
 */
export const CollectionDescriptor = () =>
	defineComponent({
		contribution: CollectionContribution(),
	})
