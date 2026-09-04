/**
 * Дескриптор CollapseItem (TCollapseItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, arrowPlacement + коллекционные item-пропсы (selected, order, view).
 */

import { defineComponent } from '../../base'
import { TCollapseItem } from '@soldy/core'
import type { ICollapseItemProps, TCollapseItemEvents } from '@soldy/core'
import { CollapseItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const CollapseItemDescriptor = () =>
	defineComponent<ICollapseItemProps, TCollapseItemEvents>()({
		ctor: TCollapseItem,

		extends: ValueControlDescriptor(),

		contribution: CollapseItemContribution(),
	})
