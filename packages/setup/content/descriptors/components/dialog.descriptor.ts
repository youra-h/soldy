/**
 * Дескриптор Dialog (TDialog) — модальное окно.
 *
 * Наследует LayerDescriptor (видимость, тег, наборы, цель телепорта, номер в
 * общем стеке) и добавляет место, размер, разворот, кнопки шапки, режим
 * предупреждения, запрос закрытия, выходы для частей без экземпляра и
 * плагины модального слоя.
 *
 * Открытость — `visible`: окно само и есть слой, и `open` рядом с ним был бы
 * вторым путём к одному факту. Поэтому плагины слоя ставятся с
 * `property: 'visible'`.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TDialog } from '@soldy-ui/core'
import {
	DialogLayoutPluginDescriptor,
	DismissPluginDescriptor,
	HideOutsidePluginDescriptor,
	ModalFocusPluginDescriptor,
	ScrollLockPluginDescriptor,
} from '../plugins'
import { LayerDescriptor } from './layer.descriptor'

export const DialogDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDialog,

		extends: LayerDescriptor(),

		contribution: {
			slots: {
				title: {
					description:
						'Заголовок окна. Он же его доступное имя: окно ссылается на него aria-labelledby',
				},
				default: { description: 'Содержимое окна. Длинное прокручивается внутри' },
				footer: { description: 'Подвал окна — ряд действий' },
				'maximize-icon': {
					description: 'Иконка кнопки разворота, пока окно не развёрнуто',
				},
				'restore-icon': { description: 'Иконка кнопки разворота у развёрнутого окна' },
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				width: { type: [Number, String], triggers: ['change:width'] },
				height: { type: [Number, String], triggers: ['change:height'] },
				placement: { type: String, triggers: ['change:placement'] },
				maximized: { type: Boolean, triggers: ['change:maximized'] },
				maximizable: { type: Boolean, triggers: ['change:maximizable'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				closeLabel: { type: String, triggers: ['change:closeLabel'] },
				maximizeLabel: { type: String, triggers: ['change:maximizeLabel'] },
				dismissible: { type: Boolean, triggers: ['change:dismissible'] },
				alert: { type: Boolean, triggers: ['change:alert'] },
				/**
				 * Стороны связок у частей без экземпляра: `id` заголовка и тела.
				 * Вычисляет ядро — формула `id` одна на обе стороны, — шаблон
				 * раскладывает на свои элементы.
				 *
				 * Значения постоянные — строятся из `uid`. Триггер всё равно нужен:
				 * проп без триггеров адаптер считает pass-through и наружу не отдаёт.
				 * `bundle:create` — тот же приём, что у `triggerAria` Tooltip.
				 */
				titleAria: { type: Object, protected: true, triggers: ['bundle:create'] },
				bodyAria: { type: Object, protected: true, triggers: ['bundle:create'] },
				/** Имена кнопок шапки. Отдельные наборы: кнопки — соседи содержимого. */
				closeAria: { type: Object, protected: true, triggers: ['change:closeLabel'] },
				maximizeAria: {
					type: Object,
					protected: true,
					triggers: ['change:maximizeLabel', 'change:maximized'],
				},
				/** Номер слоя у подложки: он у неё тот же, что у окна. */
				backdropDataset: { type: Object, protected: true, triggers: ['change:zIndex'] },
			},
			/**
			 * Пользователь закрывает окно: кнопкой, нажатием мимо или Escape.
			 * `preventDefault()` оставляет его открытым.
			 */
			events: ['close:before'],
		},

		plugins: [
			// `z-index` слоя у панели и подложки, размер — переменными
			DialogLayoutPluginDescriptor,
			// Нажатие мимо — по подложке. Без `focusOutside`: фокус из окна не
			// уходит, его держит модель фокуса. Раньше фокуса и фона: оба берут
			// у него панель
			DismissPluginDescriptor.with({ property: 'visible' }),
			// Фокус в окно и назад, Tab по кругу, Escape
			ModalFocusPluginDescriptor.with({ property: 'visible' }),
			// Фон под окном немой для скринридера
			HideOutsidePluginDescriptor.with({ property: 'visible' }),
			// Страница под окном не прокручивается
			ScrollLockPluginDescriptor.with({ property: 'visible' }),
		],
	}),
)
