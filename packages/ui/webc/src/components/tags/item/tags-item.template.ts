/**
 * Шаблон тега: строка и крестик рядом с ней. Крестик — сосед строки, а не её
 * часть: потомки опции для скринридера презентационны, и его подпись
 * приклеилась бы к названию тега. Вид набора рисует корень: фон и выбор
 * покрывают и крестик.
 *
 * Строка — деталь над экземпляром тега (`row`, `TOwnedButton`): размер,
 * вариант, выключенность и направление ей пишет тег, а роль и `tabindex` —
 * его набор `aria`, слоем владельца.
 */

import type { ITagsItem, TTagsItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../../adapter'
import { TButtonElement, registerButtonTag, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Строка — на `div`: это тег экземпляра строки, под него ядро пишет тегу ARIA (`TTagsItem._ariaTag`). */
const TButtonDivElement = registerButtonTag('div')

type TTagParts = {
	readonly row: TButtonElementProps<HTMLDivElement>
	readonly close: TButtonElementProps
	/** `null`, когда задан слот `close-icon`. */
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TTagParts>()

export const tagsItemTemplate: ITemplate<ITagsItem, TTagsItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createDetail(ownerDocument, TButtonDivElement, { embedded: 'tags.row' })
		const close = createDetail(ownerDocument, TButtonElement, {
			embedded: 'tags.close',
			attributes: { type: 'button' },
		})

		close.className = 'so-tags-item__close'

		let icon: TIconElementProps | null = null

		if (!hasSlot('close-icon')) {
			icon = createDetail(ownerDocument, TIconElement, { embedded: 'tags.close-icon' })
			icon.icon = 'close'
			lend(close, DEFAULT_SLOT, icon)
		}

		// Не клик: `press` не приходит на выключенный тег, а `toggle()` выключенность не проверяет
		row.addEventListener('so:action:press', () => {
			ctx.facade?.context?.adapters.selection.toggle()
		})

		// Не всплывает: корни тега и набора слушают клик, а поле Select открыло бы по нему панель
		close.addEventListener('click', (event) => {
			event.stopPropagation()
			ctx.facade?.context?.adapters.tags.close()
		})

		root.appendChild(row)
		parts.set(root, { row, close, icon })

		return {
			slots: {
				leading: { mode: 'append', node: row, slot: 'leading' },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: row, slot: 'trailing' },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
			control: row,
		}
	},

	bindings: [
		// На каждое подключение: в построении инстанса ещё нет, а строка собирается
		// после тега и берёт свой экземпляр при подключении
		bind([], ({ root, ctrl }) => {
			const row = parts.get(root)?.row

			if (row && ctrl && row.ctrl !== ctrl.row) row.ctrl = ctrl.row
		}),

		// Крестику и иконке — явно, от тега они не наследуют; только сменившиеся:
		// `disabled` кнопки нативный, и запись прошла бы через атрибут. Строке
		// их пишет сам тег — в её экземпляр
		bind(['disabled', 'size'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { close, icon } = own

			patch(close, { disabled: state.disabled === true, size: state.size })
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		bind('aria', ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, state.aria)
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const row = parts.get(root)?.row
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),

		// Крестик — сразу за строкой
		bind(['tag_closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, close } = own

			ownerAttributes(close, state.closeAria)

			if (state.tag_closable !== true) {
				close.remove()
			} else if (close.previousSibling !== row) {
				row.after(close)
			}
		}),
	],
}
