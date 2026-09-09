/**
 * Дескриптор ListBox (TListBox).
 *
 * Наследует `ValueControlDescriptor` и добавляет `view` плюс плагины коллекции,
 * списка и drag-and-drop.
 *
 * Именно `ValueControl`, а не `Control`: у списка есть значение — то, что
 * выбрано. Выбор был всегда, но отдавался наружу списком объектов
 * (`selected: TItem[]`), то есть внутренней моделью коллекции; потребителю
 * нужен ответ в значениях, и он же уходит в форму.
 *
 * Списочные свойства (`maxRows`, `contentFit`, `scrollBehavior`) приходят из
 * `LIST_PROPS` — общей с Select декларации. Общая там только декларация:
 * реализация у каждого своя, потому что предок занят.
 */

import { defineComponent } from '../../base'
import { TListBox } from '@soldy/core'
import type { IListBoxProps, TListBoxEvents } from '@soldy/core'
import { ListBoxContribution, type TListBoxSlots } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
	ListHeightPluginDescriptor,
	ListKeyboardPluginDescriptor,
	ListScrollPluginDescriptor,
} from '../../plugins'

export const ListBoxDescriptor = () =>
	defineComponent<IListBoxProps, TListBoxEvents, TListBoxSlots>()({
		ctor: TListBox,

		extends: ValueControlDescriptor(),

		contribution: ListBoxContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Высота по `maxRows` — единственное списочное свойство, которому
			// нужен плагин: остальные ядро применяет само
			ListHeightPluginDescriptor(),
			// Клавиатура и прокрутка (последняя читает `scrollBehavior`)
			ListKeyboardPluginDescriptor(),
			ListScrollPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	})
