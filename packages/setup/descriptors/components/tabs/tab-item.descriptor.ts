/**
 * Дескриптор TabItem (TTabItem).
 *
 * Наследование:
 * - TabItemCustomDescriptor (tag, text, closable, value, name, disabled, focused, size, variant, ...)
 *
 * Композиция:
 * - ActivatableCollectionItemDescriptor → collection:* (active)
 */

import { defineComponent } from '../../base'
import { TTabItem } from '@soldy/core'
import { TabItemContribution } from '../../../contributions'
import { TabItemCustomDescriptor } from './tab-item-custom.descriptor'
import { ActivatableCollectionItemDescriptor } from '../collection'

export const TabItemDescriptor = defineComponent({
	ctor: TTabItem,

	extends: TabItemCustomDescriptor,

	contribution: TabItemContribution,

	composition: [{
		namespace: 'collection',
		descriptor: ActivatableCollectionItemDescriptor,
		get: (instance) => instance.collectionItem,
	}],
})
