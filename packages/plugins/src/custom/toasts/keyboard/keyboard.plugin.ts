import type { IToasts, IToastsItem, TToastsCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TToastsKeyboardPluginEvents } from './types'

/** Клавиша, которая ведёт фокус к тостам. F6 занят браузером — переход между панелями окна. */
const HOTKEY = 'F8'

/**
 * TToastsKeyboardPlugin — клавиатура тостов.
 *
 * Тосты фокус не забирают: появившееся уведомление не прерывает работу.
 * Дойти до них с клавиатуры — F8 (как в Radix), её же называет имя региона
 * («Уведомления (F8)»):
 *
 * - **F8** без модификаторов, если клавишу не погасили, поднимает регион над
 *   слоями (`raise`), запоминает, где был фокус вне региона, и ведёт фокус на
 *   новейший открытый тост. Тостов нет — клавиша не наша, и её никто не
 *   гасит;
 * - **Escape** на тосте под фокусом (или на контроле в нём) закрывает его и
 *   гасится `preventDefault`. Погашенный раньше — например, поповером из
 *   содержимого тоста — тост не трогает: клавиша адресована верхнему слою;
 * - **закрыли тост с фокусом** — крестиком, Escape, жестом или таймером, —
 *   фокус переходит соседнему открытому тосту, а если его нет — туда, где он
 *   был до перехода в регион. Иначе он остался бы на гаснущем тосте и ушёл бы
 *   на `body`, когда тост уйдёт из документа.
 *
 * Слушатели висят, пока есть узел региона.
 */
export class TToastsKeyboardPlugin extends TBasePlugin<IToasts, TToastsKeyboardPluginEvents> {
	private _owner: IToasts | null = null
	private _engine: TToastsCollection | null = null
	private _elements: TCollectionElements | null = null
	/** Узел региона: на нём слушатели Escape и входа фокуса. */
	private _region: (IDomEventTarget & Node) | null = null
	private _document: Document | null = null
	/** Где был фокус до перехода в регион: туда он вернётся, когда тостов не останется. */
	private _return: Element | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IToasts>()
		this._elements = ctx.get(TCollectionElements) ?? null

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) =>
			this._bindEngine(engine),
		)
	}

	override destroy(): void {
		this._detach()

		this._owner = null
		this._engine = null
		this._elements = null

		super.destroy()
	}

	private _bindEngine(engine: TToastsCollection): void {
		this._engine = engine

		this._listenTo(engine.extensions.toasts.events, 'item:close', (toast) =>
			this._passFocus(toast),
		)
	}

	private _attach(node: Element): void {
		this._detach()

		const region: IDomEventTarget & Node = node

		region.addEventListener('keydown', this._onRegionKeyDown)
		region.addEventListener('focusin', this._onFocusIn)
		node.ownerDocument.addEventListener('keydown', this._onDocumentKeyDown)

		this._region = region
		this._document = node.ownerDocument
	}

	private _detach(): void {
		this._region?.removeEventListener('keydown', this._onRegionKeyDown)
		this._region?.removeEventListener('focusin', this._onFocusIn)
		this._document?.removeEventListener('keydown', this._onDocumentKeyDown)

		this._region = null
		this._document = null
		this._return = null
	}

	/** F8 — фокус на новейший открытый тост. */
	private readonly _onDocumentKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== HOTKEY || event.defaultPrevented) return
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

		const region = this._region
		const target = this._newest()

		if (!region || !target) return

		event.preventDefault()

		this._owner?.raise()

		const active = this._document?.activeElement

		if (active && !region.contains(active)) this._return = active

		target.focus()
	}

	/** Escape на тосте — закрыть его. */
	private readonly _onRegionKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' || event.defaultPrevented) return

		const toast = this._toastOf(event.target)

		if (!toast?.open) return

		event.preventDefault()

		toast.close()
	}

	/**
	 * Фокус пришёл в регион снаружи — запомнить откуда: Tab и нажатие тоже
	 * приводят к тостам, не только F8.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const from = event.relatedTarget

		if (from instanceof Element && !this._region?.contains(from)) this._return = from
	}

	/** Закрыли тост с фокусом — фокус соседу, иначе туда, откуда пришли. */
	private _passFocus(toast: IToastsItem): void {
		const node = this._elements?.getElementByItem(toast)
		const active = node?.ownerDocument.activeElement

		if (!node || !active || !node.contains(active)) return

		const neighbour = this._neighbour(toast)
		const target = neighbour ? this._elements?.getElementByItem(neighbour) : this._return

		if (isFocusableElement(target) && target.isConnected) target.focus()
	}

	/** Новейший открытый тост с узлом, который можно сфокусировать. */
	private _newest(): HTMLElement | SVGElement | null {
		for (const toast of this._engine?.extensions.batch.shown ?? []) {
			if (!toast.open) continue

			const node = this._elements?.getElementByItem(toast)

			if (isFocusableElement(node)) return node
		}

		return null
	}

	/** Сосед закрытого тоста — следующий открытый, у последнего — предыдущий. */
	private _neighbour(toast: IToastsItem): IToastsItem | undefined {
		const shown = this._engine?.extensions.batch.shown ?? []
		const index = shown.indexOf(toast)

		return (
			shown.slice(index + 1).find((item) => item.open) ??
			shown
				.slice(0, Math.max(0, index))
				.reverse()
				.find((item) => item.open)
		)
	}

	/** Тост, чей узел содержит цель события. */
	private _toastOf(target: EventTarget | null): IToastsItem | undefined {
		if (!(target instanceof Node)) return undefined

		return this._engine?.extensions.batch.shown.find((toast) =>
			this._elements?.getElementByItem(toast)?.contains(target),
		)
	}
}
