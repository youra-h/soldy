/**
 * Дескриптор Drawer (TDrawer) — выезжающая панель.
 *
 * Наследует ModalLayerDescriptor (видимость, слой, размер, кнопка и запрос
 * закрытия, `dismissible`, заголовок и плагины модального слоя) и добавляет
 * край, жест, место в документе, выход полосы жеста, плагин раскладки панели
 * и плагин жеста.
 *
 * Замок прокрутки переставлен со свойства `visible` на производное
 * `locksScroll`: внутри контейнера панель модальна, но прокрутку документа
 * не запирает, и флага для этого в плагине нет.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TDrawer } from '@soldy-ui/core'
import {
	DrawerLayoutPluginDescriptor,
	DrawerSwipePluginDescriptor,
	ScrollLockPluginDescriptor,
} from '../plugins'
import { ModalLayerDescriptor } from './modal-layer.descriptor'

export const DrawerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDrawer,

		extends: ModalLayerDescriptor(),

		contribution: {
			slots: {
				title: {
					description:
						'Заголовок панели. Он же её доступное имя: панель ссылается на него aria-labelledby',
				},
				default: { description: 'Содержимое панели. Длинное прокручивается внутри' },
				footer: { description: 'Подвал панели — ряд действий' },
			},
			props: {
				placement: { type: String, triggers: ['change:placement'] },
				swipe: { type: String, triggers: ['change:swipe'] },
				contained: { type: Boolean, triggers: ['change:contained'] },
				/**
				 * Рисовать ли полосу у края, за которую тянут. Вычисляет ядро: разметка
				 * без экземпляра формулу не повторяет.
				 */
				handleRendered: { type: Boolean, protected: true, triggers: ['change:swipe'] },
				/**
				 * Подложка гаснет вместе с панелью и внутри контейнера накрывает
				 * только его: к номеру слоя добавлены открытость и место.
				 */
				backdropDataset: {
					triggers: ['change:zIndex', 'change:visible', 'change:contained'],
				},
			},
		},

		plugins: [
			// `z-index` слоя у панели и подложки, размер — переменными панели
			DrawerLayoutPluginDescriptor,
			// Страница под панелью не прокручивается — если панель поверх неё
			ScrollLockPluginDescriptor.with({ property: 'locksScroll' }),
			// Смахнуть панель к её краю
			DrawerSwipePluginDescriptor,
		],
	}),
)
