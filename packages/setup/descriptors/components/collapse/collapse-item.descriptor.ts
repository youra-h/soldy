/**
 * Дескриптор CollapseItem (TCollapseItem).
 *
 * Наследование:
 * - CollapseItemCustomDescriptor (tag, text, arrowPlacement, value, name, ...)
 *
 * Композиция:
 * - SelectableCollectionItemDescriptor → collection:* (selected)
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

	extends: CollapseItemCustomDescriptor,

	contribution: CollapseItemContribution,

	composition: [{
		descriptor: SelectableCollectionItemDescriptor,
		get: (instance) => instance._collection,
	}],
})
