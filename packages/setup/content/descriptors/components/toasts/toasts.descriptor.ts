/**
 * Дескриптор Toasts (TToasts) — менеджер уведомлений и их регион.
 *
 * Наследует `LayerDescriptor` (видимость, тег, наборы, цель телепорта, подъём
 * в стеке) и добавляет место, предел видимых и длительность, плагины
 * коллекции и поведение тостов: отсчёт, удаление догасших, клавиатуру,
 * раскладку слоя и имя региона.
 *
 * Слот `default` — приложение: менеджер оборачивает его, как
 * `LocaleProvider`, а потомки берут API тостов у лифта (`useToasts()`).
 * Тосты рисует регион, телепортом в цель слоя; слоты тоста — проброс
 * `item-<слот>`, scope — scope слота тоста плюс сам тост.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TToasts } from '@soldy-ui/core'
import type { IToastsItem } from '@soldy-ui/core'
import { LayerDescriptor } from '../layer.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	ToastsKeyboardPluginDescriptor,
	ToastsLayoutPluginDescriptor,
	ToastsNamesPluginDescriptor,
	ToastsRemovalPluginDescriptor,
	ToastsTimerPluginDescriptor,
} from '../../plugins'

export const ToastsDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TToasts,

		extends: LayerDescriptor(),

		contribution: {
			slots: {
				default: {
					description: 'Приложение: менеджер оборачивает его, потомки зовут useToasts()',
				},
				item: {
					scope: {
						item: defineType<IToastsItem>(Object),
						text: defineType<string>(String),
					},
					description: 'Текст тоста. Задано — переопределяет его проп text',
				},
				'item-icon': {
					scope: { item: defineType<IToastsItem>(Object) },
					description: 'Значок тоста — перед текстом. Без слота значка нет',
				},
				'item-content': {
					scope: { item: defineType<IToastsItem>(Object) },
					description: 'Своё содержимое тоста под текстом. Без слота — render тоста',
				},
				'item-close-icon': {
					scope: { item: defineType<IToastsItem>(Object) },
					description: 'Иконка кнопки закрытия тоста',
				},
			},
			props: {
				placement: { type: String, triggers: ['change:placement'] },
				max: { type: Number, triggers: ['change:max'] },
				duration: { type: Number, triggers: ['change:duration'] },
			},
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-узлам тостов
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Отсчёт тостов с паузой на указатель, фокус и скрытую вкладку
			ToastsTimerPluginDescriptor,
			// Закрытый тост уходит из коллекции, когда догас
			ToastsRemovalPluginDescriptor,
			// F8 к тостам, Escape на тосте, фокус закрытого — соседу
			ToastsKeyboardPluginDescriptor,
			// `z-index` слоя у региона
			ToastsLayoutPluginDescriptor,
			// Имя региона от локали
			ToastsNamesPluginDescriptor,
		],
	}),
)
