/**
 * Шаблон Drawer.
 *
 * Корень — сам `<div is="so-drawer">`, выезжающая панель: классы (край
 * `so-drawer--placement-*`), наборы `aria` (`role="dialog"`, `aria-modal`,
 * `aria-labelledby`), `attrs` и `dataset` (номер слоя `data-layer`,
 * `data-open`, `data-swiping`, `data-contained`), раскладку (`z-index` слоя,
 * размер переменными) и скрытие раскладывает на него база (`ElementBase`). В
 * цель её уводит она же, а с `contained` оставляет на месте — в ближайшем
 * позиционированном предке (описание корня `teleport`). Сдвиг во время жеста
 * (`--so-swipe-offset`) плагин жеста пишет в корень сам, мимо разметки. Здесь
 * — то же, что в разметке Vue, в том же порядке.
 *
 * - Подложка `div.so-drawer__backdrop` — соседка панели, раньше её в DOM:
 *   спутник корня (`TTemplateParts.companion`). Ставит её прямо перед панелью,
 *   увозит в цель и возвращает на место вместе с ней и прячет с ней база; на
 *   неё шаблон кладёт тот же `z-index` (`layout_backdropStyles`) и номер слоя,
 *   открытость и место (`backdropDataset`): внутри контейнера она накрывает
 *   только его. Пометки владельцем у неё нет — для своей панели она мимо.
 * - На панель — `tabindex="-1"` (фокус встаёт на саму панель, когда внутри
 *   нечего фокусировать) и пометка владельцем `dismiss_ownerAttribute` — одним
 *   слоем владельца, поверх наборов ядра: атрибут потребителя главнее.
 * - Порядок в панели — полоса, заголовок, тело, подвал, потом крестик: фокус
 *   при открытии попадает на первый контрол содержимого, а крестик —
 *   последняя остановка Tab. Полоса у края `div.so-drawer__handle` под
 *   `aria-hidden` — первой, пока жест включён (`handleRendered`): за неё
 *   тянут, сама она ничего не делает. Заголовок `h2.so-drawer__title` (набор
 *   `titleAria`, слот `title`) стоит всегда — на него панель ссылается
 *   `aria-labelledby`; тело `div.so-drawer__body` (слот `default`); подвал
 *   `div.so-drawer__footer` (слот `footer`). Вокруг слотов пробелов нет:
 *   пустой заголовок и подвал тема сворачивает по `:empty`.
 * - Крестик — деталь `<button is="so-button" embedded="drawer.close"
 *   type="button">` с классом `so-drawer__close`, последним в панели — пока
 *   `closable`, а без него вне документа: тема опирается на его отсутствие.
 *   Имя — набор `closeAria` (от локали, пишет плагин имён), нажатие — запрос
 *   `requestClose('button')`. В кнопке — слот `close-icon` или иконка роли
 *   `close`. Вида и размера у крестика нет — его красит тема по контексту.
 *
 * Обработчиков закрытия, кроме крестика, у шаблона нет: нажатие мимо, Escape,
 * Tab, фокус и жест — плагины панели.
 *
 * Scope у слотов нет, как у всех слотов Web Components: открытость и команды
 * содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IDrawer } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
} from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'
import type { TDrawerOutputs } from './setup.component'

/** Части панели — одни на всё время жизни элемента. */
type TDrawerParts = {
	readonly backdrop: HTMLElement
	readonly handle: HTMLElement
	readonly title: HTMLElement
	readonly body: HTMLElement
	readonly footer: HTMLElement
	readonly close: TButtonElementProps
}

const parts = new WeakMap<HTMLElement, TDrawerParts>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

export const drawerTemplate: ITemplate<IDrawer, unknown, TDrawerOutputs> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const backdrop = ownerDocument.createElement('div')
		const handle = ownerDocument.createElement('div')
		const title = ownerDocument.createElement('h2')
		const body = ownerDocument.createElement('div')
		const footer = ownerDocument.createElement('div')
		const close = createDetail(
			ownerDocument,
			'button',
			{ is: 'so-button', embedded: 'drawer.close', attributes: { type: 'button' } },
			isButton,
		)

		backdrop.className = 'so-drawer__backdrop'
		handle.className = 'so-drawer__handle'
		handle.setAttribute('aria-hidden', 'true')
		title.className = 'so-drawer__title'
		body.className = 'so-drawer__body'
		footer.className = 'so-drawer__footer'
		close.className = 'so-drawer__close'

		// Своя иконка крестика — только без слота `close-icon`: заданный слот
		// заменяет её целиком
		if (!hasSlot('close-icon')) {
			const icon = createDetail(
				ownerDocument,
				'span',
				{ is: 'so-icon', embedded: 'drawer.close-icon' },
				isIcon,
			)

			icon.icon = 'close'
			lend(close, DEFAULT_SLOT, icon)
		}

		close.addEventListener('click', () => ctx.ctrl?.requestClose('button'))

		// Крестик — в панели с построения: свет слота иконки едет в него, не
		// выходя из документа. Без `closable` его снимает первая раскладка
		root.append(title, body, footer, close)
		parts.set(root, { backdrop, handle, title, body, footer, close })

		return {
			companion: backdrop,
			slots: {
				title: { mode: 'append', node: title },
				default: { mode: 'append', node: body },
				footer: { mode: 'append', node: footer },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// Остановка фокуса и пометка владельцем — на панель, одним слоем владельца
		bind('dismiss_ownerAttribute', ({ root, state }) => {
			ownerAttributes(root, { tabindex: '-1', ...state.dismiss_ownerAttribute })
		}),

		// Подложка — тот же слой, открытость и место, что у панели
		bind('layout_backdropStyles', ({ root, state }) => {
			const backdrop = parts.get(root)?.backdrop

			if (backdrop) ownerStyles(backdrop, state.layout_backdropStyles)
		}),

		bind('backdropDataset', ({ root, state }) => {
			const backdrop = parts.get(root)?.backdrop

			if (backdrop) ownerAttributes(backdrop, state.backdropDataset)
		}),

		bind('titleAria', ({ root, state }) => {
			const title = parts.get(root)?.title

			if (title) ownerAttributes(title, state.titleAria)
		}),

		// Полоса жеста — первой в панели, пока жест включён
		bind('handleRendered', ({ root, state }) => {
			const handle = parts.get(root)?.handle

			if (!handle) return

			if (state.handleRendered !== true) {
				handle.remove()
			} else if (root.firstChild !== handle) {
				root.prepend(handle)
			}
		}),

		// Крестик — последним в панели, пока панель можно закрыть им
		bind(['closable', 'closeAria'], ({ root, state }) => {
			const close = parts.get(root)?.close

			if (!close) return

			ownerAttributes(close, state.closeAria)

			if (state.closable !== true) {
				close.remove()
			} else if (!close.isConnected) {
				root.append(close)
			}
		}),
	],
}
