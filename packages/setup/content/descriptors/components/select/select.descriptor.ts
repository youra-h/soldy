/**
 * Дескриптор Select (TSelect).
 *
 * Наследует InputControlDescriptor: value, name, readonly, required, плюс всё
 * от Control (disabled, focused, size, variant) и ComponentView. Добавляет
 * состояние панели, жест и плагины оверлея.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TSelect } from '@soldy-ui/core'
import type { IInput, ISelectItem } from '@soldy-ui/core'
import { InputControlDescriptor } from '../input-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DismissPluginDescriptor,
	ListHeightPluginDescriptor,
	SelectBackspacePluginDescriptor,
	SelectEditablePluginDescriptor,
	SelectIdsPluginDescriptor,
	SelectKeyboardPluginDescriptor,
	SelectPointerPluginDescriptor,
	SwipePluginDescriptor,
} from '../../plugins'
import { LIST_PROPS } from '../list'

export const SelectDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelect,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * `field` и `clear` отделены от `default` структурно, а не по вкусу:
			 * `default` кладётся внутрь `[role=listbox]`, и всё, что туда попадёт,
			 * скринридер сочтёт опцией. Поле и кнопка очистки живут снаружи панели.
			 *
			 * `empty` показывается вместо списка, когда опций нет: пустой `listbox`
			 * для скринридера — тупик, а сообщение хотя бы объясняет, что происходит.
			 *
			 * `field` отдаёт сам `field` — экземпляр `TInput`, единственный держатель
			 * текста, плейсхолдера и ARIA поля (тем же приёмом, что `:ctrl="field"` у
			 * встроенной разметки, см. `TSelect.field`, `TSelectExtension`). Второго
			 * пути к тем же данным больше нет: раньше слот отдавал `text`/`placeholder`
			 * отдельными пропами, а они дублировали то, что уже есть у `field`, и
			 * `placeholder` при этом расходился с ним — не учитывал теги.
			 */
			slots: {
				field: {
					scope: { field: defineType<IInput>(Object) },
					description: 'Содержимое поля вместо встроенного Input',
				},
				/**
				 * `leading` и `trailing` — проброс одноимённых слотов Input: у него
				 * они уже есть, и заводить своё было бы вторым способом делать то же
				 * самое. `trailing` идёт после кнопки очистки и стрелки, то есть
				 * дополняет их, а не заменяет.
				 */
				leading: { description: 'Перед полем' },
				/**
				 * Проброс слота `clear` поля: кнопку очистки рисует поле, а своя
				 * кнопка заменяет её целиком. Scope — команда поля `clear`: она
				 * очищает поле, а выбор Select снимает по её событию.
				 */
				clear: {
					scope: { clear: defineType<() => void>(Function) },
					description: 'Кнопка очистки значения',
				},
				'arrow-icon': { description: 'Стрелка состояния панели' },
				trailing: { description: 'После стрелки' },
				default: { description: 'Опции — элементы коллекции' },
				empty: { description: 'Когда опций нет' },
				item: {
					scope: { item: defineType<ISelectItem>(Object) },
					description: 'Содержимое опции при работе через проп items',
				},
				'item-leading': {
					scope: { item: defineType<ISelectItem>(Object) },
					description: 'Перед содержимым опции',
				},
				'item-trailing': {
					scope: { item: defineType<ISelectItem>(Object) },
					description: 'После содержимого опции',
				},
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				placeholder: { type: String, triggers: ['change:placeholder'] },
				closeOnSelect: { type: Boolean, triggers: ['change:closeOnSelect'] },
				/**
				 * Кнопку очистки рисует поле: `clearable` и `clearLabel` Select
				 * отдаёт ему, как `name` и `size`, и её имя собирает поле.
				 */
				clearable: { type: Boolean, triggers: ['change:clearable'] },
				clearLabel: { type: String, triggers: ['change:clearLabel'] },
				editable: { type: Boolean, triggers: ['change:editable'] },
				editableMode: { type: String, triggers: ['change:editableMode'] },
				removeOnBackspace: { type: Boolean, triggers: ['change:removeOnBackspace'] },
				placement: { type: String, triggers: ['change:placement'] },
				/** За что панель смахивают, чтобы закрыть. По умолчанию — ни за что. */
				swipe: { type: String, triggers: ['change:swipe'] },
				/**
				 * Роль, `id` и множественность списка. Набор Select'а, а не свой:
				 * список — разметка внутри шаблона, экземпляра у него нет.
				 */
				listAria: { type: Object, protected: true, triggers: ['change:listAria'] },
				/** Можно ли открыть панель: запрещает только `disabled`. */
				openable: {
					type: Boolean,
					protected: true,
					triggers: ['change:disabled'],
				},
				/**
				 * Подгонять ли ширину панели под поле — производное от `contentFit`.
				 *
				 * Вычисляет ядро, шаблон только пробрасывает в `anchor_matchWidth`.
				 * Оставь выражение `contentFit !== 'expand'` в разметке — и оно
				 * повторится в каждом из шести адаптеров.
				 */
				autoFitWidth: {
					type: Boolean,
					protected: true,
					triggers: ['change:contentFit'],
				},
				/**
				 * Сторона панели и разрешение flip для плагина якоря — производные от
				 * `placement`, как `autoFitWidth` от `contentFit`. Вычисляет ядро,
				 * шаблон только пробрасывает в `anchor_placement` и `anchor_flip`.
				 */
				panelPlacement: {
					type: String,
					protected: true,
					triggers: ['change:placement'],
				},
				panelFlip: {
					type: Boolean,
					protected: true,
					triggers: ['change:placement'],
				},
				/**
				 * `data-*` панели: тянут ли её. Панель — Frame без экземпляра в ядре,
				 * и набор для неё — Select'а, как `listAria` списка. Открытость панели
				 * (`data-open`) пишет её слой, сторону (`data-placement`) — плагин
				 * якоря.
				 */
				panelDataset: { type: Object, protected: true, triggers: ['change:swiping'] },
				/**
				 * Рисовать ли полосу, за которую тянут. Вычисляет ядро: разметка
				 * без экземпляра формулу не повторяет.
				 */
				handleRendered: { type: Boolean, protected: true, triggers: ['change:swipe'] },
				// Общие с ListBox — объявлены один раз в `components/list.ts`
				...LIST_PROPS,
			},
			events: ['open', 'close'],
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам опций
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Высота панели по `maxRows`. Тот же плагин, что у ListBox: свойство
			// объявлено общим контрактом `IList`, а инстанс у каждого свой
			ListHeightPluginDescriptor,
			// Закрытие по нажатию мимо. Общий слой оверлея, им же потом
			// воспользуются Menu и Popover
			DismissPluginDescriptor,
			// Клик по полю: тумблер в select-only, только стрелка в editable
			SelectPointerPluginDescriptor,
			// Клавиатура APG Combobox: открытие, навигация, Escape, набор по буквам
			SelectKeyboardPluginDescriptor,
			// Ввод текста при editable: search/filter подсвечивают совпадение
			// через клавиатурный плагин выше — подключается после него
			SelectEditablePluginDescriptor,
			// Удаление тегов по Backspace в пустом поле — editable + multiple,
			// включается свойством removeOnBackspace
			SelectBackspacePluginDescriptor,
			// `id` списка и `aria-controls` поля
			SelectIdsPluginDescriptor,
			// Смахнуть панель, чтобы закрыть. После dismiss: берёт у него панель
			SwipePluginDescriptor,
		],
	}),
)
