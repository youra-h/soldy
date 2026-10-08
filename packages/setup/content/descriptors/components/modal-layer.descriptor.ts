/**
 * Дескриптор ModalLayer (TModalLayer) — модальный слой, общая база окна и
 * выезжающей панели.
 *
 * Наследует LayerDescriptor (видимость, тег, наборы, цель телепорта, номер в
 * общем стеке) и добавляет то, что следует из модальности: размер, кнопку
 * закрытия, `dismissible`, запрос закрытия, выходы для частей без экземпляра
 * и плагины модального слоя. Раскладку — место, край, разворот, жест —
 * приносят наследники вместе со своим плагином раскладки.
 *
 * Открытость — `visible`: модальный слой сам и есть слой, и `open` рядом с
 * ним был бы вторым путём к одному факту. Поэтому плагины слоя ставятся с
 * `property: 'visible'`.
 *
 * Имена кнопок — из словаря приложения: его пишет плагин словаря, а разметка
 * получает готовые наборы (`closeAria`, у окна — `maximizeAria`).
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TModalLayer } from '@soldy-ui/core'
import {
	DismissPluginDescriptor,
	HideOutsidePluginDescriptor,
	ModalFocusPluginDescriptor,
	ScrollLockPluginDescriptor,
	TranslationsPluginDescriptor,
} from '../plugins'
import { LayerDescriptor } from './layer.descriptor'

export const ModalLayerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TModalLayer,

		extends: LayerDescriptor(),

		contribution: {
			slots: {
				title: {
					description:
						'Заголовок. Он же доступное имя: панель ссылается на него aria-labelledby',
				},
				default: { description: 'Содержимое. Длинное прокручивается внутри' },
				footer: { description: 'Подвал — ряд действий' },
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				width: { type: [Number, String], triggers: ['change:width'] },
				height: { type: [Number, String], triggers: ['change:height'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				dismissible: { type: Boolean, triggers: ['change:dismissible'] },
				/**
				 * Сторона связки у заголовка — части без экземпляра. Набор слоя:
				 * `id` в него пишет плагин связок наследника (`ids`), шаблон
				 * раскладывает на свой элемент.
				 */
				titleAria: { type: Object, protected: true, triggers: ['change:titleAria'] },
				/**
				 * Имя кнопки закрытия — из словаря. Отдельный набор: кнопка — сосед
				 * содержимого.
				 */
				closeAria: { type: Object, protected: true, triggers: ['change:translations'] },
				/**
				 * Номер слоя и открытость у подложки: они у неё те же, что у
				 * панели. По открытости подложка гаснет вместе с панелью.
				 */
				backdropDataset: {
					type: Object,
					protected: true,
					triggers: ['change:zIndex', 'change:visible'],
				},
			},
			/**
			 * Пользователь закрывает панель: кнопкой, нажатием мимо, Escape или
			 * жестом. `preventDefault()` оставляет её открытой.
			 */
			events: ['close:before'],
		},

		plugins: [
			// Словарь приложения — до поведения: имена кнопок есть с первой
			// отрисовки
			TranslationsPluginDescriptor,
			// Нажатие мимо — по подложке. Без `focusOutside`: фокус из модального
			// слоя не уходит, его держит модель фокуса. Раньше фокуса и фона:
			// оба берут у него панель
			DismissPluginDescriptor.with({ property: 'visible' }),
			// Фокус в панель и назад, Tab по кругу, Escape
			ModalFocusPluginDescriptor.with({ property: 'visible' }),
			// Фон под панелью немой для скринридера
			HideOutsidePluginDescriptor.with({ property: 'visible' }),
			// Страница под панелью не прокручивается
			ScrollLockPluginDescriptor.with({ property: 'visible' }),
		],
	}),
)
