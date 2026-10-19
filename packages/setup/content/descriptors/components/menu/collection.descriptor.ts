/**
 * Дескрипторы коллекционной части меню — фасады владельца и пункта.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`MenuDescriptor`, `MenuItemDescriptor`): адаптер собирает компонент из обоих
 * рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'
import { GROUP_PROPS } from '../list'

export const MenuCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Сверх состава у меню — группы пунктов: ключ группы пункта, порядок и
		 * подписи групп (общий фрагмент `GROUP_PROPS`, как у ListBox и Select) и
		 * выход — секции показанного, по которым разметка рисует группы и
		 * разделители. Режима выбора нет: выбор у меню — отметки флажков, и
		 * режим всегда `multiple` (его ставит коллекция), а отметку каждый флажок
		 * отдаёт своим `selected`. Событие — нажатие пункта-действия, его фасад
		 * отдаёт пробросом расширения `menu`.
		 */
		contribution: {
			props: {
				...GROUP_PROPS,
				/**
				 * Секции показанных пунктов по порядку: группа с подписью или
				 * пункты без группы. Между соседними секциями разметка рисует
				 * разделитель
				 */
				sections: { type: Array, protected: true, triggers: ['change:sections'] },
			},
			events: ['choose'],
		},
	}),
)

/**
 * Фасад пунктов подменю — тот же фасад меню: у пункта с подменю своя
 * коллекция, такая же, как у меню, со своим составом, группами и `choose`.
 * Своего сверх меню нет. Дескриптор — свой: это коллекционная часть
 * `Menu.Submenu`, и её пропсы входят в интерфейс подменю
 * (`IMenuSubmenuProps`), а не меню.
 */
export const MenuSubmenuCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuCollectionFacade,

		extends: MenuCollectionDescriptor(),
	}),
)

/**
 * Фасад пункта-действия: своих пропсов у него нет — нажатие разметка отдаёт
 * item-адаптеру `menu` через `context`, а отметки у действия не бывает. Тот
 * же фасад — у пунктов со своей панелью, подменю и пункта с панелью: в меню
 * они пункты, и их нажатие (`open`) разметка отдаёт тому же item-адаптеру.
 */
export const MenuCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuItemCollectionFacade,
	}),
)

/**
 * Фасад флажка: тот же класс, что у действия, и отметка — выбор коллекции.
 * Записываемая: `v-model:selected` у флажка — его отметка в обе стороны.
 */
export const MenuCollectionCheckboxItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuItemCollectionFacade,

		contribution: {
			props: {
				selected: { type: Boolean, triggers: ['change:selected'] },
			},
		},
	}),
)
