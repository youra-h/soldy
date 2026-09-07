/**
 * Дескриптор Collapse (TCollapse).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: view + плагины (коллекция + drag-and-drop).
 */

import { defineComponent } from '../../base'
import { TCollapse } from '@soldy/core'
import type { ICollapseProps, TCollapseEvents } from '@soldy/core'
import { CollapseContribution, type TCollapseSlots } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
} from '../../plugins'

export const CollapseDescriptor = () =>
	defineComponent<ICollapseProps, TCollapseEvents, TCollapseSlots>()({
		ctor: TCollapse,

		extends: ControlDescriptor(),

		contribution: CollapseContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	})
