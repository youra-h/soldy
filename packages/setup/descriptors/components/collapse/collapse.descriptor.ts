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

import { defineComponent, definePlugin } from '../../base'
import { TCollapse } from '@soldy/core'
// import { TDragPlugin } from '@soldy/plugins'
import { CollapseContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'

export const CollapseDescriptor = defineComponent({
	ctor: TCollapse,

	extends: ControlDescriptor,

	contribution: CollapseContribution,

	plugins: [
		// definePlugin({
		// 	ctor: TDragPlugin,
		// }),
	],
})
