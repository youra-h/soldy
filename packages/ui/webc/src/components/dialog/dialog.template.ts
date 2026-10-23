/**
 * Шаблон Dialog.
 *
 * Корень — сам `<div is="so-dialog">`, панель окна: классы (место
 * `so-dialog--placement-*`), наборы `aria` (`role="dialog"`, `aria-modal`,
 * `aria-labelledby`), `attrs` и `dataset` (номер слоя `data-layer`,
 * `data-open`, `data-maximized`), раскладку (`z-index` слоя, размер и отступ
 * переменными) и скрытие раскладывает на него база (`ElementBase`), и в цель
 * его уводит она же — по описанию корня элемента (`teleport`). Здесь — то же,
 * что в разметке Vue, в том же порядке.
 *
 * - Подложка `div.so-dialog__backdrop` — соседка панели, раньше её в DOM:
 *   спутник корня (`TTemplateParts.companion`). Ставит её прямо перед окном,
 *   увозит в цель вместе с ним и прячет с ним база; на неё шаблон кладёт тот
 *   же `z-index` (`layout_backdropStyles`) и номер слоя с открытостью
 *   (`backdropDataset`). Пометки владельцем у подложки нет — для своего окна
 *   нажатие по ней мимо. Обязательна: фон спрятан от скринридера, но не от
 *   указателя, и к странице его не пускает только она.
 * - На окно — `tabindex="-1"` (фокус встаёт на саму панель, когда внутри
 *   нечего фокусировать) и пометка владельцем `dismiss_ownerAttribute` — одним
 *   слоем владельца, поверх наборов ядра: атрибут потребителя главнее, как
 *   `$attrs` у Vue. Без пометки плагины не нашли бы слой окна, и нажатие в
 *   список внутри закрыло бы окно.
 * - Порядок в окне — заголовок, тело, подвал, потом кнопки: фокус при открытии
 *   попадает на первый контрол содержимого, а крестик — последняя остановка
 *   Tab. В ряд заголовка кнопки переносит тема. Заголовок
 *   `h2.so-dialog__title` (набор `titleAria`, слот `title`) стоит всегда — на
 *   него окно ссылается `aria-labelledby`; тело `div.so-dialog__body` (набор
 *   `bodyAria` — описание предупреждения, слот `default`); подвал
 *   `div.so-dialog__footer` (слот `footer`). Вокруг слотов пробелов нет:
 *   пустой заголовок и подвал тема сворачивает по `:empty`.
 * - Кнопка разворота — деталь `<button is="so-button" embedded="dialog.maximize"
 *   type="button">` с классом `so-dialog__maximize`, в окне — пока
 *   `maximizable`. Переключатель: имя и `aria-pressed` — набор `maximizeAria`
 *   верхним слоем её раскладчика, нажатие — `toggleMaximized()` инстанса
 *   текущей связки. Значок — по состоянию окна: «развернуть», пока окно не
 *   развёрнуто (слот `maximize-icon` или иконка роли `arrowsOutward`), и
 *   «вернуть размер» — у развёрнутого (`restore-icon` или `arrowsInward`).
 *   Видимый значок стоит в кнопке перед меткой — комментарием, который шаблон
 *   кладёт в её слот по умолчанию (`lendMark`): метка остаётся там, куда
 *   кнопка, собравшись, положила свой слот, и значок встаёт туда же и до, и
 *   после её сборки (`lendBefore`), без обёртки, которой нет у Vue. Слоты
 *   значков выводит привязка (`showSlot`), свои иконки — шаблон, у скрытого
 *   варианта узлов в документе нет.
 * - Крестик — деталь `<button is="so-button" embedded="dialog.close"
 *   type="button">` с классом `so-dialog__close`, последним в окне — пока
 *   `closable`. Имя — набор `closeAria` (от локали, пишет плагин имён), нажатие
 *   — запрос `requestClose('button')`: отменить закрытие может подписчик
 *   `close:before`, куда вернуть фокус, решает плагин фокуса. В кнопке — слот
 *   `close-icon` или иконка роли `close`.
 *
 * Кнопки шапки, которых нет, — вне документа, а не спрятаны: тема опирается на
 * их отсутствие (`:has()`). Вида и размера у них нет — кнопки красит тема по
 * контексту. Обработчиков закрытия, кроме крестика, у шаблона нет: нажатие
 * мимо, Escape, Tab и фокус — плагины модального слоя.
 *
 * Scope у слотов нет, как у всех слотов Web Components: открытость и команды
 * содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IDialog } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	lendBefore,
	lendMark,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
} from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'
import type { TDialogOutputs } from './setup.component'

/** Части окна — одни на всё время жизни элемента. */
type TDialogParts = {
	readonly backdrop: HTMLElement
	readonly title: HTMLElement
	readonly body: HTMLElement
	readonly footer: HTMLElement
	readonly maximize: TButtonElementProps
	/** Метка места значка в кнопке разворота (см. шапку). */
	readonly mark: Comment
	/** Своя иконка «развернуть» — без слота `maximize-icon`. */
	readonly outward: TIconElementProps | null
	/** Своя иконка «вернуть размер» — без слота `restore-icon`. */
	readonly inward: TIconElementProps | null
	readonly close: TButtonElementProps
}

const parts = new WeakMap<HTMLElement, TDialogParts>()

/** Кнопка шапки — деталь разметки с именем места и классом. */
function buttonOf(owner: Document, embedded: string, className: string): TButtonElementProps {
	const button = createDetail(owner, TButtonElement, { embedded, attributes: { type: 'button' } })

	button.className = className

	return button
}

/** Иконка роли — деталь разметки с именем места. */
function iconOf(owner: Document, embedded: string, role: string): TIconElementProps {
	const icon = createDetail(owner, TIconElement, { embedded })

	icon.icon = role

	return icon
}

/**
 * Своя иконка значка разворота — перед меткой, пока её вариант виден, и вне
 * документа, пока нет. Иконки нет — значок этого варианта даёт слот.
 */
function toggleIcon(icon: TIconElementProps | null, mark: Comment, shown: boolean): void {
	if (!icon) return

	if (!shown) {
		icon.remove()
	} else if (icon.nextSibling !== mark) {
		lendBefore(mark, icon)
	}
}

/** Кнопка шапки — в окне, пока она есть, на своём месте, и вне документа, пока нет. */
function toggleButton(button: HTMLElement, shown: boolean, put: () => void): void {
	if (!shown) {
		button.remove()
	} else if (!button.isConnected) {
		put()
	}
}

export const dialogTemplate: ITemplate<IDialog, unknown, TDialogOutputs> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const backdrop = ownerDocument.createElement('div')
		const title = ownerDocument.createElement('h2')
		const body = ownerDocument.createElement('div')
		const footer = ownerDocument.createElement('div')
		const maximize = buttonOf(ownerDocument, 'dialog.maximize', 'so-dialog__maximize')
		const close = buttonOf(ownerDocument, 'dialog.close', 'so-dialog__close')

		backdrop.className = 'so-dialog__backdrop'
		title.className = 'so-dialog__title'
		body.className = 'so-dialog__body'
		footer.className = 'so-dialog__footer'

		// Метка — в слот по умолчанию кнопки разворота (`lendMark`); свои иконки —
		// только без слота своего варианта: заданный слот заменяет иконку целиком
		const mark = lendMark(maximize, DEFAULT_SLOT)

		const outward = hasSlot('maximize-icon')
			? null
			: iconOf(ownerDocument, 'dialog.maximize-icon', 'arrowsOutward')
		const inward = hasSlot('restore-icon')
			? null
			: iconOf(ownerDocument, 'dialog.restore-icon', 'arrowsInward')

		if (!hasSlot('close-icon')) {
			lend(close, DEFAULT_SLOT, iconOf(ownerDocument, 'dialog.close-icon', 'close'))
		}

		maximize.addEventListener('click', () => ctx.ctrl?.toggleMaximized())
		close.addEventListener('click', () => ctx.ctrl?.requestClose('button'))

		// Кнопки — в окне с построения: свет слотов значков едет в них, не выходя
		// из документа. Которых нет, первая раскладка снимает
		root.append(title, body, footer, maximize, close)
		parts.set(root, { backdrop, title, body, footer, maximize, mark, outward, inward, close })

		return {
			companion: backdrop,
			slots: {
				title: { mode: 'append', node: title },
				default: { mode: 'append', node: body },
				footer: { mode: 'append', node: footer },
				'maximize-icon': { mode: 'before', node: mark, slot: DEFAULT_SLOT },
				'restore-icon': { mode: 'before', node: mark, slot: DEFAULT_SLOT },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// Остановка фокуса и пометка владельцем — на окно, одним слоем владельца
		bind('dismiss_ownerAttribute', ({ root, state }) => {
			ownerAttributes(root, { tabindex: '-1', ...state.dismiss_ownerAttribute })
		}),

		// Подложка — тот же слой и та же открытость, что у окна
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

		bind('bodyAria', ({ root, state }) => {
			const body = parts.get(root)?.body

			if (body) ownerAttributes(body, state.bodyAria)
		}),

		// Кнопка разворота — после подвала, пока окно можно развернуть
		bind(['maximizable', 'maximizeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			ownerAttributes(own.maximize, state.maximizeAria)
			toggleButton(own.maximize, state.maximizable === true, () =>
				own.footer.after(own.maximize),
			)
		}),

		// Значок разворота — по состоянию окна (см. шапку)
		bind('maximized', ({ root, state, showSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const maximized = state.maximized === true

			showSlot('maximize-icon', !maximized)
			showSlot('restore-icon', maximized)
			toggleIcon(own.outward, own.mark, !maximized)
			toggleIcon(own.inward, own.mark, maximized)
		}),

		// Крестик — последним в окне, пока окно можно закрыть им
		bind(['closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			ownerAttributes(own.close, state.closeAria)
			toggleButton(own.close, state.closable === true, () => root.append(own.close))
		}),
	],
}
