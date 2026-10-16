/**
 * Дескрипторы коллекционной части Toasts — фасады владельца и тоста.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`ToastsDescriptor`, `ToastsItemDescriptor`): адаптер собирает компонент из
 * обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TToastsCollectionFacade, TToastsItemCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'

export const ToastsCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TToastsCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Своих пропсов сверх состава у фасада нет: выбора и активации у тостов
		 * нет. Событие — закрытие тоста, его фасад отдаёт пробросом расширения
		 * `toasts`.
		 */
		contribution: {
			events: ['item:close'],
		},
	}),
)

export const ToastsCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TToastsItemCollectionFacade,

		/**
		 * Item-level пропсы тоста — то, что выводит фасад
		 * `TToastsItemCollectionFacade`: место в коллекции.
		 */
		contribution: {
			props: {
				order: { type: Number, protected: true, triggers: ['change:order'] },
			},
		},
	}),
)
