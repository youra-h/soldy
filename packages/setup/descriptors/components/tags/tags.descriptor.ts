/**
 * Дескриптор Tags (TTags).
 *
 * Наследует `ValueControlDescriptor` и добавляет `closable` плюс плагины
 * коллекции. В отличие от ListBox здесь нет списочных плагинов (высота,
 * клавиатура, прокрутка) и drag-and-drop: теги — ряд кнопок, а не
 * фокусируемый список, см. AGENTS «Граница переиспользования».
 */

import { defineComponent } from '../../base'
import { TTags } from '@soldy/core'
import type { ITagsProps, TTagsEvents } from '@soldy/core'
import { TagsContribution, type TTagsSlots } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { CollectionBundlesPluginDescriptor, CollectionElementsPluginDescriptor } from '../../plugins'

export const TagsDescriptor = () =>
	defineComponent<ITagsProps, TTagsEvents, TTagsSlots>()({
		ctor: TTags,

		extends: ValueControlDescriptor(),

		contribution: TagsContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
		],
	})
