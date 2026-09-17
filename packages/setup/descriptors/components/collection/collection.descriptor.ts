import { defineComponent, defineDescriptor } from '../../../define'
import { CollectionContribution } from '../../../contributions'

/**
 * Базовый дескриптор владельца коллекции.
 * Содержит общие props/events (items, trackBy + engine-события).
 * Конкретные коллекции (Tabs, Accordion, ...) наследуют его через `extends`.
 */
export const CollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		contribution: CollectionContribution(),
	}),
)
