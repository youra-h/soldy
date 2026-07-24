/**
 * Дескриптор CollapseItem (TCollapseItem).
 *
 * Множественное наследование:
 * - CollapseItemCustomDescriptor (tag, text, arrowPlacement, value, name, ...)
 * - SelectableCollectionItemDescriptor (selected)
 *
 * Добавляет: view.
 */

import { defineComponent } from '../../base'
import { TCollapseItem } from '@soldy/core'
import { CollapseItemContribution } from '../../../contributions'
import { CollapseItemCustomDescriptor } from './collapse-item-custom.descriptor'
import { SelectableCollectionItemDescriptor } from '../collection'

export const CollapseItemDescriptor = defineComponent({
	ctor: TCollapseItem,

	extends: [CollapseItemCustomDescriptor, SelectableCollectionItemDescriptor],

	contribution: CollapseItemContribution,
})
