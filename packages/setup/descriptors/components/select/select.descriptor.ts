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
	ListHeightPluginDescriptor,
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
			// Свойства раскладки — те же, что у ListBox: они про раскладку, а не
			// про семантику списка. Но применяет Select только высоту: правила
			// `--auto-width` и `data-word-wrap` тема даёт лишь для `.s-list-box`,
			// и вешать их обработчики сюда значило бы писать в DOM впустую
			ListLayoutPluginDescriptor(),
			ListHeightPluginDescriptor(),
			// Закрытие по нажатию мимо. Общий слой оверлея, им же потом
			// воспользуются Menu и Popover
			DismissPluginDescriptor(),
			// Клавиатура APG Combobox: открытие, навигация, Escape, набор по буквам
			SelectKeyboardPluginDescriptor(),
		],
	})
