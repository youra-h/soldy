/**
 * Дескриптор Accordion (TAccordion).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: view + плагины (коллекция + drag-and-drop).
 */

import { defineComponent } from '../../base'
import { TAccordion } from '@soldy/core'
import type { IAccordionProps, TAccordionEvents } from '@soldy/core'
import { AccordionContribution, type TAccordionSlots } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
} from '../../plugins'

export const AccordionDescriptor = () =>
	defineComponent<IAccordionProps, TAccordionEvents, TAccordionSlots>()({
		ctor: TAccordion,

		extends: ControlDescriptor(),

		contribution: AccordionContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	})
