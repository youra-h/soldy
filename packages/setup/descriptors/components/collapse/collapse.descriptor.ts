/**
 * Дескриптор Collapse (TCollapse).
 *
 * Множественное наследование:
 * - ControlDescriptor (disabled, focused, size, variant, ...)
 * - SelectableCollectionDescriptor (items, mode, selected, events: item:selected/...)
 *
 * Добавляет: view + плагины.
 */

import { defineComponent, definePlugin } from '../../base'
import { TCollapse } from '@soldy/core'
import { TCollapseHeightPlugin, TDragPlugin } from '@soldy/plugins'
import { CollapseContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import { SelectableCollectionDescriptor } from '../collection'

export const CollapseDescriptor = defineComponent({
	ctor: TCollapse,

	extends: [ControlDescriptor, SelectableCollectionDescriptor],

	contribution: CollapseContribution,

	plugins: [
		definePlugin({
			ctor: TCollapseHeightPlugin,
		}),
		definePlugin({
			ctor: TDragPlugin,
		}),
	],
})
