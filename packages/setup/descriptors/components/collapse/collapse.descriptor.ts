/**
 * Дескриптор Collapse (TCollapse).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, ...)
 *
 * Композиция:
 * - SelectableCollectionDescriptor → collection:* (items, mode, selected, events)
 *
 * Добавляет: view + плагины.
 */

import { defineComponent } from '../../base'
import { TCollapse } from '@soldy/core'
import { CollapseContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import { DragPluginDescriptor } from '../../plugins'

export const CollapseDescriptor = () =>
	defineComponent({
		ctor: TCollapse,

		extends: ControlDescriptor(),

		contribution: CollapseContribution(),

		plugins: [DragPluginDescriptor()],
	})
