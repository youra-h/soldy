/**
 * Дескрипторы коллекционной части RadioGroup — фасады владельца и радио.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`RadioGroupDescriptor`, `RadioGroupItemDescriptor`): адаптер собирает
 * компонент из обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TRadioGroupCollectionFacade, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'

export const RadioGroupCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TRadioGroupCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props/events владельца RadioGroup — то, что выводит фасад
		 * `TRadioGroupCollectionFacade`: отмеченное радио. Наружу значение
		 * отдаёт `value` группы, поэтому `activeItem` только на чтение.
		 */
		contribution: {
			props: {
				activeItem: { type: Object, protected: true, triggers: ['change:activation'] },
			},
			events: ['item:activated', 'item:deactivated'],
		},
	}),
)

export const RadioGroupCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TRadioGroupItemCollectionFacade,

		/**
		 * Item-level пропсы радио — то, что выводит фасад
		 * `TRadioGroupItemCollectionFacade`: отмечено ли радио и его порядок.
		 */
		contribution: {
			props: {
				active: { type: Boolean, triggers: ['change:active'] },
				order: { type: Number, protected: true, triggers: ['change:order'] },
			},
		},
	}),
)
