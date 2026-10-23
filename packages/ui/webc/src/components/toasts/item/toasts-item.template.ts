/**
 * Шаблон тоста.
 *
 * Корень — сам `<li is="so-toasts-item">`, место тоста в списке: высота места,
 * сдвиг жеста, уход и прозрачность (тема). Классы (вид сообщения
 * `so-toasts-item--type-*`), наборы `aria` (роль `status` или `alert`,
 * `tabindex` — фокус по F8 и Escape), `attrs` и `dataset` (`data-open`,
 * `data-swiping`) и скрытие раскладывает на него база (`ElementBase`). Сдвиг
 * во время жеста (`--so-swipe-offset`) плагин жеста пишет в корень сам. Здесь
 * — то же, что в разметке Vue, в том же порядке.
 *
 * - Глубина в стопке — переменная `--so-toasts-depth` корня из `order` фасада
 *   (место тоста в составе): в стопке передний — первый. Это запись разметки,
 *   как `:style` корня у Vue, и кладёт её шаблон (`ownerStyles`).
 * - Плашка `div.so-toasts-item__card` — то, что видно: поверхность, кромка,
 *   тень и кольцо фокуса корня. Отдельный узел: место растёт и схлопывается
 *   переходом высоты, а плашка своего размера не меняет.
 * - Коробка значка `span.so-toasts-item__icon` под `aria-hidden` стоит всегда,
 *   и в ней одно из трёх: пока тост ждёт (`loading`) — бегущее кольцо, деталь
 *   ProgressSpinner `toasts.spinner`, при любом виде и что бы ни стояло в
 *   слоте; задан слот `icon` — свой значок; иначе — значок вида по роли иконки
 *   (`<span is="so-icon" embedded="toasts.icon">`): `info`, `success`,
 *   `warning`, `error`, у обычного сообщения — `notification`. Слот выводит
 *   привязка (`showSlot`), кольцо и значок вида — шаблон: у скрытого узлов в
 *   документе нет.
 * - Текст — `div.so-toasts-item__body`: заголовок `div.so-toasts-item__text`
 *   (слот `default`, без него — `text` тоста), описание
 *   `div.so-toasts-item__description` (`description` тоста) и своё содержимое
 *   `div.so-toasts-item__content` (слот `content`, без него — то, что отдал
 *   `render` тоста: функция получает тост и отдаёт узел — кнопку «Отменить»,
 *   которая его закрывает). Пустую часть тема сворачивает по `:empty`.
 * - Крестик — деталь `<button is="so-button" embedded="toasts.close"
 *   type="button">` с классом `so-toasts-item__close`, последним в плашке —
 *   пока `closable`, а без него вне документа. Имя — набор `closeAria` (из
 *   локали вместе с текстом тоста), нажатие — `close()` инстанса текущей
 *   связки. В кнопке — слот `close-icon` или иконка роли `close`.
 *
 * Слоты тоста владелец задаёт копиями своих образцов `item-*`
 * (`TOASTS_ITEM_SLOTS`): тост — внутренняя часть, его рисует только регион.
 * Scope у слотов нет, как у всех слотов Web Components: тост и его вид копия
 * берёт у элемента тоста — `el.ctrl` ближайшего `.so-toasts-item`.
 */

import type { IToastsItem, TToastsItemCollectionFacade, TToastsItemType } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	isToastRender,
	lend,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
} from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'
import { TProgressSpinnerElement, type TProgressSpinnerElementProps } from '../../progress-spinner'

/**
 * Значок вида — по роли, своей у каждого вида: в режиме принудительных цветов
 * вид различает только глиф. Таблица закрыта по виду (`satisfies`): новый вид
 * без своего значка не соберётся.
 */
const TYPE_ICONS = {
	info: 'info',
	success: 'success',
	warning: 'warning',
	error: 'error',
} satisfies Record<TToastsItemType, string>

/** Значок обычного сообщения — тоста без вида. */
const NOTIFICATION_ICON = 'notification'

/** Части тоста — одни на всё время жизни элемента. */
type TToastParts = {
	readonly card: HTMLElement
	/** Коробка значка. */
	readonly box: HTMLElement
	/** Кольцо ожидания. */
	readonly spinner: TProgressSpinnerElementProps
	/** Значок вида — без слота `icon`. */
	readonly glyph: TIconElementProps | null
	readonly text: HTMLElement
	readonly description: HTMLElement
	readonly content: HTMLElement
	readonly close: TButtonElementProps
}

const parts = new WeakMap<HTMLElement, TToastParts>()

/** Узел — в коробке значка, пока он виден, и вне документа, пока нет. */
function toggleIn(box: HTMLElement, node: HTMLElement | null, shown: boolean): void {
	if (!node) return

	if (!shown) {
		node.remove()
	} else if (node.parentNode !== box) {
		box.appendChild(node)
	}
}

export const toastsItemTemplate: ITemplate<IToastsItem, TToastsItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const card = ownerDocument.createElement('div')
		const box = ownerDocument.createElement('span')
		const body = ownerDocument.createElement('div')
		const text = ownerDocument.createElement('div')
		const description = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')
		const spinner = createDetail(ownerDocument, TProgressSpinnerElement, {
			embedded: 'toasts.spinner',
		})
		const close = createDetail(ownerDocument, TButtonElement, {
			embedded: 'toasts.close',
			attributes: { type: 'button' },
		})

		card.className = 'so-toasts-item__card'
		box.className = 'so-toasts-item__icon'
		box.setAttribute('aria-hidden', 'true')
		body.className = 'so-toasts-item__body'
		text.className = 'so-toasts-item__text'
		description.className = 'so-toasts-item__description'
		content.className = 'so-toasts-item__content'
		close.className = 'so-toasts-item__close'

		// Размер и вариант кольцу разметка не передаёт: диаметр и цвет даёт тема
		// по месту — коробке значка
		spinner.indeterminate = true

		// Значок вида — только без слота `icon`: заданный слот заменяет его
		const glyph = hasSlot('icon')
			? null
			: createDetail(ownerDocument, TIconElement, { embedded: 'toasts.icon' })

		// Своя иконка крестика — только без слота `close-icon`
		if (!hasSlot('close-icon')) {
			const icon = createDetail(ownerDocument, TIconElement, {
				embedded: 'toasts.close-icon',
			})

			icon.icon = 'close'
			lend(close, DEFAULT_SLOT, icon)
		}

		close.addEventListener('click', () => ctx.ctrl?.close())

		body.append(text, description, content)
		card.append(box, body, close)
		root.appendChild(card)
		parts.set(root, { card, box, spinner, glyph, text, description, content, close })

		return {
			slots: {
				icon: { mode: 'append', node: box },
				default: { mode: 'append', node: text },
				content: { mode: 'append', node: content },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// Глубина в стопке — место тоста в составе
		bind('order', ({ root, state }) => {
			ownerStyles(
				root,
				typeof state.order === 'number' ? { '--so-toasts-depth': state.order } : undefined,
			)
		}),

		// Значок вида — по роли вида, у обычного сообщения — своя. Раньше, чем
		// значок встанет в коробку: он собирается уже со своей ролью
		bind('type', ({ root, state }) => {
			const glyph = parts.get(root)?.glyph

			if (!glyph) return

			const role = state.type ? TYPE_ICONS[state.type] : NOTIFICATION_ICON

			if (glyph.icon !== role) glyph.icon = role
		}),

		// В коробке значка — кольцо, пока тост ждёт; иначе слот или значок вида
		bind('loading', ({ root, state, showSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const loading = state.loading === true

			showSlot('icon', !loading)
			toggleIn(own.box, own.spinner, loading)
			toggleIn(own.box, own.glyph, !loading)
		}),

		// Текст — заголовку, пока он не задан слотом `default`
		bind('text', ({ root, state, hasSlot }) => {
			const text = parts.get(root)?.text
			const value = state.text ?? ''

			if (text && !hasSlot(DEFAULT_SLOT) && text.textContent !== value) {
				text.textContent = value
			}
		}),

		bind('description', ({ root, state }) => {
			const description = parts.get(root)?.description
			const value = state.description ?? ''

			if (description && description.textContent !== value) description.textContent = value
		}),

		// Своё содержимое — узел от `render`, пока оно не задано слотом `content`
		bind('render', ({ root, state, ctrl, hasSlot }) => {
			const content = parts.get(root)?.content

			if (!content || hasSlot('content')) return

			const render = state.render

			content.replaceChildren(...(ctrl && isToastRender(render) ? [render(ctrl)] : []))
		}),

		// Крестик — последним в плашке, пока тост можно закрыть им
		bind(['closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			ownerAttributes(own.close, state.closeAria)

			if (state.closable !== true) {
				own.close.remove()
			} else if (own.close.parentNode !== own.card) {
				own.card.appendChild(own.close)
			}
		}),
	],
}
