/**
 * Дескриптор Select (TSelect).
 *
 * Наследует InputControlDescriptor: value, name, readonly, required, плюс всё
 * от Control (disabled, focused, size, variant) и ComponentView. Добавляет
 * состояние панели и плагины оверлея.
 */

import { defineComponent } from '../../base'
import { TSelect } from '@soldy/core'
import type { ISelectProps, TSelectEvents } from '@soldy/core'
import { SelectContribution, type TSelectSlots } from '../../../contributions'
import { InputControlDescriptor } from '../input-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DismissPluginDescriptor,
	ListLayoutPluginDescriptor,
	SelectKeyboardPluginDescriptor,
} from '../../plugins'

export const SelectDescriptor = () =>
	defineComponent<ISelectProps, TSelectEvents, TSelectSlots>()({
		ctor: TSelect,

		extends: InputControlDescriptor(),

		contribution: SelectContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам опций
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Ограничение высоты списка по maxRows — тот же плагин, что у List:
			// он про раскладку, а не про семантику списка
			ListLayoutPluginDescriptor(),
			// Закрытие по нажатию мимо. Общий слой оверлея, им же потом
			// воспользуются Menu и Popover
			DismissPluginDescriptor(),
			// Клавиатура APG Combobox: открытие, навигация, Escape, набор по буквам
			SelectKeyboardPluginDescriptor(),
		],
	})
