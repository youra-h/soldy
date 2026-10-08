/**
 * Дескриптор Dialog (TDialog) — модальное окно.
 *
 * Наследует ModalLayerDescriptor (видимость, слой, размер, кнопка и запрос
 * закрытия, `dismissible`, заголовок и плагины модального слоя) и добавляет
 * место, отступ от краёв экрана, разворот, режим предупреждения, выходы
 * кнопки разворота и тела и плагин раскладки окна.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TDialog } from '@soldy-ui/core'
import {
	DialogIdsPluginDescriptor,
	DialogLayoutPluginDescriptor,
	DialogNamesPluginDescriptor,
} from '../plugins'
import { ModalLayerDescriptor } from './modal-layer.descriptor'

export const DialogDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDialog,

		extends: ModalLayerDescriptor(),

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
			},
			props: {
				placement: { type: String, triggers: ['change:placement'] },
				/**
				 * Отступ от краёв экрана, один на все стороны. Теме уходит
				 * переменными раскладки; стороны по отдельности правит подписчик
				 * `layout:offset:before`.
				 */
				offset: { type: [Number, String], triggers: ['change:offset'] },
				maximized: { type: Boolean, triggers: ['change:maximized'] },
				maximizable: { type: Boolean, triggers: ['change:maximizable'] },
				alert: { type: Boolean, triggers: ['change:alert'] },
				/**
				 * Сторона связки у тела — `id` для `aria-describedby`
				 * предупреждения. Набор окна: `id` в него пишет
				 * `TDialogIdsPlugin`.
				 */
				bodyAria: { type: Object, protected: true, triggers: ['change:bodyAria'] },
				/**
				 * Набор кнопки разворота — её имя и состояние. Отдельный набор:
				 * кнопка — сосед содержимого. Состояние пишет окно, имя —
				 * `TDialogNamesPlugin`.
				 */
				maximizeAria: { type: Object, protected: true, triggers: ['change:maximizeAria'] },
			},
		},

		plugins: [
			// `z-index` слоя у панели и подложки, размер и отступ — переменными окна
			DialogLayoutPluginDescriptor,
			// Имя от заголовка и описание предупреждения: `id` и ссылки на них
			DialogIdsPluginDescriptor,
			// Имена кнопок закрытия и разворота от локали
			DialogNamesPluginDescriptor,
		],
	}),
)
