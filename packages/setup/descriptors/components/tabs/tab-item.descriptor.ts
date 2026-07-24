/**
 * Дескриптор TabItem (TTabItem).
 *
 * Множественное наследование:
 * - TabItemCustomDescriptor (tag, text, closable, value, name, disabled, focused, size, variant, ...)
 * - ActivatableCollectionItemDescriptor (active)
 */

import { defineComponent } from '../../base'
import { TTabItem } from '@soldy/core'
import { TabItemContribution } from '../../../contributions'
import { TabItemCustomDescriptor } from './tab-item-custom.descriptor'
import { ActivatableCollectionItemDescriptor } from '../collection/activable/activatable-collection-item.descriptor'

export const TabItemDescriptor = defineComponent({
	ctor: TTabItem,

	extends: [TabItemCustomDescriptor, ActivatableCollectionItemDescriptor],

	contribution: TabItemContribution,
})
