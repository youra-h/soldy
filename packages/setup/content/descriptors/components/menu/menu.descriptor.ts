/**
 * Дескриптор Menu (TMenu) — меню действий у кнопки (APG Menu Button) или
 * контекстное меню области (`openOn: 'contextmenu'`).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, tag, наборы и
 * плагины element/ready) и добавляет открытость, сторону панели, способ
 * открытия, разделители секций группировки, выходы для разметки и плагины:
 * коллекцию пунктов, нажатие мимо, клавиатуру, прокрутку списка пунктов,
 * открытие и указатель, модель фокуса и связки.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TMenu } from '@soldy-ui/core'
import type { IMenuItem, TAriaAttributes, TDatasetAttributes } from '@soldy-ui/core'
import { TMenuKeyboardPlugin } from '@soldy-ui/plugins'
import { StylableDescriptor } from '../stylable.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DismissPluginDescriptor,
	ListScrollPluginDescriptor,
	MenuFocusPluginDescriptor,
	MenuHoverPluginDescriptor,
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
			 * действия, а пункт с вложенным `items` — подменю. Каждый слот строки
			 * есть у меню как `item-<слот>`, и scope у него — scope слота строки
			 * плюс сам пункт. `default` у действия — `item`, у подменю —
			 * `item-content`, как панель у Accordion. Подменю из данных меню
			 * отдаёт свои `item` и `item-*` под теми же именами, поэтому слоты
			 * одни на все уровни.
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
					description: 'Содержимое пункта-действия при работе через проп items',
				},
				'item-leading': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Значок пункта — действия и подменю — при работе через проп items',
				},
				'item-trailing': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Подсказка сочетания клавиш при работе через проп items',
				},
				'item-header': {
					scope: {
						item: defineType<IMenuItem>(Object),
						text: defineType<string>(String),
						open: defineType<boolean>(Boolean),
					},
					description: 'Текст строки подменю при работе через проп items',
				},
				'item-arrow-icon': {
					scope: { item: defineType<IMenuItem>(Object) },
					description: 'Стрелка подменю при работе через проп items',
				},
				'item-content': {
					scope: { item: defineType<IMenuItem>(Object) },
					description:
						'Пункты подменю разметкой вместо его items. Пусто — подменю рисует свои пункты из данных',
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
				 * Рисовать ли разделитель между соседними секциями группировки
				 * пунктов из данных. Свойство меню, а не фасада: секции отдаёт
				 * коллекция, разделитель рисует разметка. Ручной `Menu.Separator`
				 * оно не трогает.
				 */
				groupSeparators: { type: Boolean, triggers: ['change:groupSeparators'] },
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
				/** Whether the panel's items are mounted: from the first opening on. */
				contentRendered: { type: Boolean, protected: true, triggers: ['change:open'] },
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
			// Прокрутка списка пунктов за отметкой флажков и переключателей и за
			// подсветкой — тот же плагин, что у ListBox и Select: фокус подсветки
			// ставится без прокрутки. После клавиатуры: слушает её подсветку
			ListScrollPluginDescriptor.with({ navigation: TMenuKeyboardPlugin }),
			// Открытие по способу `openOn` — клик по кнопке или контекстное меню
			// области. После клавиатуры: открывает через неё
			MenuPointerPluginDescriptor,
			// Указатель в панели: подсветка пунктов, открытие панелей пунктов
			// наведением и путь к ним. После клавиатуры: подсвечивает через неё
			MenuHoverPluginDescriptor,
			// Фокус при открытии и закрытии, Escape и Tab. После dismiss и
			// клавиатуры: берёт у них панель, `dismiss` и строку подсвеченного
			MenuFocusPluginDescriptor,
			// `id` и ссылки «кнопка ↔ меню» — пока меню открывают кнопкой
			MenuIdsPluginDescriptor,
		],
	}),
)
