/**
 * Дескрипторы коллекционной части Pagination — фасады владельца и страницы.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`PaginationDescriptor`, `PaginationItemDescriptor`): адаптер собирает
 * компонент из обоих рантайм-списков.
 *
 * Базы `CollectionDescriptor` здесь нет, как у календаря: её `items` и
 * `trackBy` пагинации не положены. Страницы окна кладёт в коллекцию
 * расширение пагинации, ключ сверки — ключ страницы, и чужой `trackBy`
 * сломал бы её. Движок снаружи (`engine`) — положен, как у остальных
 * коллекций.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TPaginationCollectionFacade, TPaginationItemCollectionFacade } from '@soldy-ui/core'

export const PaginationCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TPaginationCollectionFacade,

		/**
		 * Коллекционные props владельца Pagination — то, что выводит фасад
		 * `TPaginationCollectionFacade`: окно. Текущую страницу наружу отдаёт
		 * `value` пагинации, поэтому событий активации здесь нет.
		 */
		contribution: {
			props: {
				/**
				 * Готовая коллекция снаружи — аналог `ctrl` у компонента, как у
				 * остальных коллекций (`CollectionDescriptor`). Без триггеров: это
				 * вход, а не наблюдаемое значение. Собирает её
				 * `createEnginePagination`; чего движку не хватает, фасад
				 * доустановит при привязке.
				 */
				engine: { type: Object },
				/**
				 * Окно по порядку: страницы (элементы коллекции) и пропуски между
				 * ними. Разметка — одна петля по нему, ключ места — `key`.
				 */
				cells: { type: Array, protected: true, triggers: ['change:cells'] },
			},
		},
	}),
)

export const PaginationCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TPaginationItemCollectionFacade,

		/**
		 * Пропсов нет. Текущую страницу отмечают расширения коллекции прямо в её
		 * наборах — `data-selected` и `aria-current`, — и разметке читать
		 * `active` незачем.
		 */
		contribution: {},
	}),
)
