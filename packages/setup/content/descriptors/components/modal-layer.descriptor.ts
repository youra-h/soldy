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
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TModalLayer } from '@soldy-ui/core'
import {
	DismissPluginDescriptor,
	HideOutsidePluginDescriptor,
	ModalFocusPluginDescriptor,
	ScrollLockPluginDescriptor,
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
				closeLabel: { type: String, triggers: ['change:closeLabel'] },
				dismissible: { type: Boolean, triggers: ['change:dismissible'] },
				/**
				 * Сторона связки у заголовка — части без экземпляра. Вычисляет ядро
				 * — формула `id` одна на обе стороны, — шаблон раскладывает на свой
				 * элемент.
				 *
				 * Значение постоянное — строится из `uid`. Триггер всё равно нужен:
				 * проп без триггеров адаптер считает pass-through и наружу не отдаёт.
				 * `bundle:create` — тот же приём, что у `triggerAria` Tooltip.
				 */
				titleAria: { type: Object, protected: true, triggers: ['bundle:create'] },
				/** Имя кнопки закрытия. Отдельный набор: кнопка — сосед содержимого. */
				closeAria: { type: Object, protected: true, triggers: ['change:closeLabel'] },
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
