/**
 * Дескриптор TabItem (TTabItem).
 *
 * Наследует TabItemCustomDescriptor (tag, text, closable, value, name, ...)
 * + ActivatableCollectionItemDescriptor (active).
 */

import { defineComponent } from '../../base'
import { TTabItem } from '@soldy/core'
import { TabItemContribution } from '../../../contributions/components/tab-item'
import { TabItemCustomDescriptor } from './tab-item-custom.descriptor'

export const TabItemDescriptor = defineComponent({
	ctor: TTabItem,

	extends: TabItemCustomDescriptor,

	contribution: TabItemContribution,
})
