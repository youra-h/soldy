/**
 * Дескриптор Menu (TMenu) — меню действий у кнопки (APG Menu Button) или
 * контекстное меню области (`openOn: 'contextmenu'`).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, tag, наборы и
 * плагины element/ready) и добавляет открытость, сторону панели, способ
 * открытия, выходы для разметки и плагины: коллекцию пунктов, нажатие мимо,
 * клавиатуру, открытие и указатель, модель фокуса и связки.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenu } from '@soldy-ui/core'
import type { IMenuItem, TAriaAttributes, TDatasetAttributes } from '@soldy-ui/core'
import { StylableDescriptor } from '../stylable.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DismissPluginDescriptor,
	MenuFocusPluginDescriptor,
	MenuIdsPluginDescriptor,
	MenuKeyboardPluginDescriptor,
	MenuPointerPluginDescriptor,
} from '../../plugins'

export const MenuDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenu,

		extends: StylableDescriptor(),

		contribution: {
			/**
			 * Триггер — слот внутри корня, как у Popover: корень служит панели
			 * якорем, а нажатие по открытому триггеру остаётся нажатием внутри
			 * владельца. Своей ARIA у содержимого слота нет, поэтому сторону
			 * связки компонент отдаёт ему в scope. У контекстного меню в слоте —
			 * область, по которой его вызывают, и связки у неё нет.
			 *
			 * Пункты — слот `default`; без него меню рисует пункты из `items` —
			 * только действия. Каждый слот пункта есть у меню как `item-<слот>`
			 * (`default` — `item`), и scope у него — scope слота пункта плюс сам
			 * пункт.
			 */
			slots: {
				trigger: {
					scope: {
						triggerAria: defineType<TAriaAttributes>(Object),
						triggerDataset: defineType<TDatasetAttributes>(Object),
					},
					description:
						'Кнопка, которая открывает меню, а у контекстного меню — область. ARIA и data-* для кнопки — в scope',
				},
				default: { description: 'Пункты меню, группы и разделители' },
				item: {
					scope: {
						item: defineType<IMenuItem>(Object),
						text: defineType<string>(String),
					},
					description: 'Содержимое пункта при работе через проп items',
				},
				'item-leading': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Значок пункта при работе через проп items',
				},
				'item-trailing': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Подсказка сочетания клавиш при работе через проп items',
				},
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				placement: { type: String, triggers: ['change:placement'] },
				/**
				 * Чем меню открывают: кнопкой (`press`) или как контекстное меню
				 * области в слоте `trigger` (`contextmenu`).
				 */
				openOn: { type: String, triggers: ['change:openOn'] },
				/**
				 * Точка вызова контекстного меню в координатах окна. Пишет её плагин
				 * открытия, шаблон отдаёт якорю панели (`anchor_point`): панель
				 * встаёт у неё, а не у корня.
				 */
				point: { type: Object, protected: true, triggers: ['change:point'] },
				/**
				 * Сторона триггера в связке с панелью и его вид «нажат». Вычисляют
				 * ядро и `TMenuIdsPlugin` (`id`, `aria-controls`), шаблон
				 * раскладывает в scope слота `trigger`. У области контекстного
				 * меню связки нет — набор пуст.
				 */
				triggerAria: { type: Object, protected: true, triggers: ['change:triggerAria'] },
				triggerDataset: { type: Object, protected: true, triggers: ['change:open'] },
				/**
				 * Классы панели — блок `so-menu__panel` с размером и вариантом
				 * меню: панель телепортирована, и модификаторы корня до неё не
				 * доходят.
				 */
				panelClasses: {
					type: Object,
					protected: true,
					triggers: ['change:panelClasses'],
				},
			},
		},

		plugins: [
			// Коллекция пунктов: реестр bundles и доступ к их узлам
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Нажатие мимо и уход фокуса мимо: фокус у меню в панели, и без
			// `focusOutside` Tab со страницы оставлял бы его открытым
			DismissPluginDescriptor.with({ focusOutside: true }),
			// Клавиши триггера и панели, подсветка — фокус. После dismiss: берёт
			// у него панель
			MenuKeyboardPluginDescriptor,
			// Открытие по способу `openOn` — клик по кнопке или контекстное меню
			// области — и наведение на пункты. После клавиатуры: открывает и
			// подсвечивает через неё
			MenuPointerPluginDescriptor,
			// Фокус при открытии и закрытии, Escape и Tab. После dismiss и
			// клавиатуры: берёт у них панель, `dismiss` и строку подсвеченного
			MenuFocusPluginDescriptor,
			// `id` и ссылки «кнопка ↔ меню» — пока меню открывают кнопкой
			MenuIdsPluginDescriptor,
		],
	}),
)
