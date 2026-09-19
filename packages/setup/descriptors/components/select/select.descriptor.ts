/**
 * Дескриптор Select (TSelect).
 *
 * Наследует InputControlDescriptor: value, name, readonly, required, плюс всё
 * от Control (disabled, focused, size, variant) и ComponentView. Добавляет
 * состояние панели и плагины оверлея.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TSelect } from '@soldy/core'
import type {
	IInput,
	ISelectItem,
	TSelectEditableMode,
	TSelectPanelPlacement,
	TSelectPlacement,
} from '@soldy/core'
import { InputControlDescriptor } from '../input-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DismissPluginDescriptor,
	ListHeightPluginDescriptor,
	SelectBackspacePluginDescriptor,
	SelectEditablePluginDescriptor,
	SelectKeyboardPluginDescriptor,
	SelectPointerPluginDescriptor,
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
				clear: { description: 'Кнопка очистки значения' },
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
				clearable: { type: Boolean, triggers: ['change:clearable'] },
				clearLabel: { type: String, triggers: ['change:clearLabel'] },
				editable: { type: Boolean, triggers: ['change:editable'] },
				editableMode: {
					type: defineType<TSelectEditableMode>(String),
					triggers: ['change:editableMode'],
				},
				removeOnBackspace: { type: Boolean, triggers: ['change:removeOnBackspace'] },
				placement: {
					type: defineType<TSelectPlacement>(String),
					triggers: ['change:placement'],
				},
				/**
				 * Имя кнопки очистки. Отдельный набор, а не часть `aria`: `aria`
				 * описывает само поле, а это соседняя кнопка.
				 */
				clearAria: {
					type: Object,
					protected: true,
					triggers: ['change:clearLabel', 'change:name'],
				},
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
					type: defineType<TSelectPanelPlacement>(String),
					protected: true,
					triggers: ['change:placement'],
				},
				panelFlip: {
					type: Boolean,
					protected: true,
					triggers: ['change:placement'],
				},
				// Общие с ListBox — объявлены один раз в `components/list.ts`
				...LIST_PROPS,
			},
			events: ['open', 'close'],
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам опций
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Высота панели по `maxRows`. Тот же плагин, что у ListBox: свойство
			// объявлено общим контрактом `IList`, а инстанс у каждого свой
			ListHeightPluginDescriptor(),
			// Закрытие по нажатию мимо. Общий слой оверлея, им же потом
			// воспользуются Menu и Popover
			DismissPluginDescriptor(),
			// Клик по полю: тумблер в select-only, только стрелка в editable
			SelectPointerPluginDescriptor(),
			// Клавиатура APG Combobox: открытие, навигация, Escape, набор по буквам
			SelectKeyboardPluginDescriptor(),
			// Ввод текста при editable: search/filter подсвечивают совпадение
			// через клавиатурный плагин выше — подключается после него
			SelectEditablePluginDescriptor(),
			// Удаление тегов по Backspace в пустом поле — editable + multiple,
			// включается свойством removeOnBackspace
			SelectBackspacePluginDescriptor(),
		],
	}),
)
