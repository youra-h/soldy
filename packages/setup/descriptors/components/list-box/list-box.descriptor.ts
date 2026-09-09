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
 * Раскладки (`maxRows`, `wordWrap`, `autoWidth`, `scrollBehavior`) в этом файле
 * нет намеренно: их объявляет и обрабатывает `ListLayoutPluginDescriptor`.
 * Подключён он с `flatProps`, поэтому наружу они выглядят обычными пропами
 * ListBox — и ровно так же достаются Select, который списком не является.
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
	ListLayoutPluginDescriptor,
	ListAutoWidthPluginDescriptor,
	ListWordWrapPluginDescriptor,
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
			// Свойства раскладки — и следом те, кто их применяет. Порядок важен:
			// каждый из них берёт значение через `ctx.get(TListLayoutPlugin)`,
			// а `use()` ставит плагины по очереди.
			ListLayoutPluginDescriptor(),
			ListAutoWidthPluginDescriptor(),
			ListWordWrapPluginDescriptor(),
			ListHeightPluginDescriptor(),
			// Клавиатура и прокрутка (последняя читает `scrollBehavior`)
			ListKeyboardPluginDescriptor(),
			ListScrollPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	})
