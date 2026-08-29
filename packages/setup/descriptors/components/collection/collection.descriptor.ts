import { CollectionContribution } from '../../../contributions'
import {
	BatchExtensionDescriptor,
	MetaExtensionDescriptor,
	OrderExtensionDescriptor,
	PlainExtensionDescriptor,
	UniqueExtensionDescriptor,
} from './extensions'
import { defineCollection } from '../../base'

/**
 * Базовая коллекция: engine prop + базовые extensions (unique, meta, order, plain, batch).
 *
 * Конкретные коллекции наследуют через `defineCollection({ extends: CollectionDescriptor, ... })`
 * и добавляют свои специфичные расширения (factory, activation, tabs, selection, ...).
 */
export const CollectionDescriptor = () =>
	defineCollection({
		contribution: CollectionContribution(),

		extensions: [
			UniqueExtensionDescriptor(),
			MetaExtensionDescriptor(),
			OrderExtensionDescriptor(),
			PlainExtensionDescriptor(),
			BatchExtensionDescriptor(),
		],
	})
