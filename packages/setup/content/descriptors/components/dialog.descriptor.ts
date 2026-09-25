/**
 * Дескриптор Dialog (TDialog) — модальное окно.
 *
 * Наследует ModalLayerDescriptor (видимость, слой, размер, кнопка и запрос
 * закрытия, `dismissible`, заголовок и плагины модального слоя) и добавляет
 * место, разворот, режим предупреждения, выходы кнопки разворота и тела и
 * плагин раскладки окна.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TDialog } from '@soldy-ui/core'
import { DialogLayoutPluginDescriptor } from '../plugins'
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
				maximized: { type: Boolean, triggers: ['change:maximized'] },
				maximizable: { type: Boolean, triggers: ['change:maximizable'] },
				maximizeLabel: { type: String, triggers: ['change:maximizeLabel'] },
				alert: { type: Boolean, triggers: ['change:alert'] },
				/**
				 * Сторона связки у тела — `id` для `aria-describedby`
				 * предупреждения. Постоянное значение, триггер — как у
				 * `titleAria`.
				 */
				bodyAria: { type: Object, protected: true, triggers: ['bundle:create'] },
				/** Имя и состояние кнопки разворота. Отдельный набор: кнопка — сосед содержимого. */
				maximizeAria: {
					type: Object,
					protected: true,
					triggers: ['change:maximizeLabel', 'change:maximized'],
				},
			},
		},

		plugins: [
			// `z-index` слоя у панели и подложки, размер — переменными окна
			DialogLayoutPluginDescriptor,
		],
	}),
)
