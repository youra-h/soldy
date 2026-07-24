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
import { TCollapseHeightPlugin, TDragPlugin } from '@soldy/plugins'
import { CollapseContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import { SelectableCollectionDescriptor } from '../collection'

export const CollapseDescriptor = defineComponent({
	ctor: TCollapse,

	extends: ControlDescriptor,

	contribution: CollapseContribution,

	composition: [{
		descriptor: SelectableCollectionDescriptor,
		get: (instance) => instance.collection,
	}],

	plugins: [
		definePlugin({
			ctor: TCollapseHeightPlugin,
		}),
		definePlugin({
			ctor: TDragPlugin,
		}),
	],
})
