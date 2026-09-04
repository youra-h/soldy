/**
 * Дескриптор ListBox (TListBox).
 *
 * Наследует ListDescriptor (maxRows, autoWidth, wordWrap, scrollBehavior, ...)
 * и добавляет view + плагины коллекции, списка и drag-and-drop.
 */

import { defineComponent } from '../../base'
import { TListBox } from '@soldy/core'
import type { IListBoxProps, TListBoxEvents } from '@soldy/core'
import { ListBoxContribution } from '../../../contributions'
import { ListDescriptor } from '../list'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
	ListLayoutPluginDescriptor,
	ListKeyboardPluginDescriptor,
	ListScrollPluginDescriptor,
} from '../../plugins'

export const ListBoxDescriptor = () =>
	defineComponent<IListBoxProps, TListBoxEvents>()({
		ctor: TListBox,

		extends: ListDescriptor(),

		contribution: ListBoxContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Список: maxRows, клавиатура, скролл
			ListLayoutPluginDescriptor(),
			ListKeyboardPluginDescriptor(),
			ListScrollPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	})
