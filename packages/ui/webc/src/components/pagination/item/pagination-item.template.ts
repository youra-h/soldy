/**
 * Шаблон страницы пагинации.
 *
 * Корень — сам `<li is="so-pagination-item">`, место страницы в списке:
 * классы, `attrs`, `dataset` (`data-selected` — текущая, его пишет активация
 * коллекции, как у таба, — и `data-disabled`) и скрытие раскладывает на него
 * база (`ElementBase`). Здесь — строка, как у Vue.
 *
 * - Строка — деталь `<button is="so-button" embedded="pagination.page"
 *   type="button">` с номером или текстом страницы. На ней `size` и `variant`
 *   страницы (их диктует пагинация, как табам набор), `disabled` и набор
 *   `aria` страницы верхним слоем её раскладчика: `aria-current="page"` у
 *   текущей пишет расширение коллекции. Текущая — обычная, не выключенная
 *   кнопка: каждая страница — своя остановка Tab. Вида нет: `plain`, у
 *   текущей — заливку, и квадрат узкого номера даёт тема по контексту.
 * - Содержимое строки — слот `default` страницы, свет строки (свет детали), а
 *   без него строке уходит текст страницы (`text`). В слот страницы пагинация
 *   кладёт копию своего образца `item`.
 * - Нажатие делает страницу текущей — активацией коллекции, через контекст
 *   элемента фасада текущей связки, как у строки таба; значение пагинации за
 *   ней пишет расширение коллекции. Нажатие по текущей ничего не меняет.
 *
 * Scope у слотов нет, как у всех слотов Web Components: страницу и её текст
 * содержимое слота берёт у элемента страницы (`el.ctrl`).
 */

import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, ownerAttributes, type ITemplate } from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'

/** Строка каждой страницы — одна на всё время жизни элемента. */
const rows = new WeakMap<HTMLElement, TButtonElementProps>()

export const paginationItemTemplate: ITemplate<IPaginationItem, TPaginationItemCollectionFacade> = {
	create: (root, ctx) => {
		const row = createDetail(root.ownerDocument, TButtonElement, {
			embedded: 'pagination.page',
			attributes: { type: 'button' },
		})

		row.addEventListener('click', () => {
			const context = ctx.facade?.context

			if (context) context.adapters.activation.active = true
		})

		root.appendChild(row)
		rows.set(root, row)

		return {
			slots: {
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// Пропсы детали — только сменившиеся: `disabled` кнопки нативный, и
		// каждая запись прошла бы через его атрибут
		bind(['disabled', 'size', 'variant'], ({ root, state }) => {
			const row = rows.get(root)

			if (!row) return

			const disabled = state.disabled === true

			if (row.disabled !== disabled) row.disabled = disabled
			if (row.size !== state.size) row.size = state.size
			if (row.variant !== state.variant) row.variant = state.variant
		}),

		bind('aria', ({ root, state }) => {
			const row = rows.get(root)

			if (row) ownerAttributes(row, state.aria)
		}),

		// Текст страницы — строке, пока содержимое не задано слотом `default`
		bind('text', ({ root, state, hasSlot }) => {
			const row = rows.get(root)
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),
	],
}
