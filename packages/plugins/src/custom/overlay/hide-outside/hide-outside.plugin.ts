import { FRAME_LAYER_ATTRIBUTE } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import { isAboveLayer } from '../../../utils'
import { bindOverlayOpen } from '../open-state'
import type { IOverlayOpenState } from '../types'
import { markHidden, unmarkHidden } from './marks'
import type { IHideOutsidePluginOptions, THideOutsidePluginEvents } from './types'

/**
 * Поводы пересчитать набор: состав поддерева `body` и номера слоёв. Свой
 * атрибут (`aria-hidden`) в фильтр не входит — запись пометок наблюдателя не
 * будит.
 */
const OBSERVED: MutationObserverInit = {
	childList: true,
	subtree: true,
	attributes: true,
	attributeFilter: [FRAME_LAYER_ATTRIBUTE],
}

/**
 * THideOutsidePlugin — пока владелец открыт, фон под ним спрятан от
 * скринридера.
 *
 * Вторая половина модальности. Фокус в модальной панели держит
 * `TModalFocusPlugin`, но скринридер читает страницу и без фокуса — режимом
 * чтения, стрелками. APG требует, чтобы фон модального окна был для него
 * недоступен: `aria-modal="true"` на панели (его пишет ядро окна в свой
 * `aria`) закрывает это только у современных скринридеров, а режим чтения
 * браузера и старые AT уважают лишь пометку на самих узлах фона.
 *
 * **Пометка — `aria-hidden="true"`, а не `inert`.** `inert` отнимает у фона
 * ещё и фокус, а фокусом владеет модель фокуса: при закрытии она сразу
 * возвращает его в фон, и пока фон `inert`, `focus()` молча не срабатывает.
 * Работа зависела бы от того, какой из двух плагинов раньше узнал о
 * закрытии. Здесь — только то, что видит скринридер.
 *
 * **Что остаётся доступным.** Панель — узел с пометкой владельцем
 * (`TDismissPlugin.findPanel()`), а без неё корень: у модального окна корень
 * телепортирован целиком (то же правило, что у `TModalFocusPlugin`). И
 * слои, открытые поверх панели: список Select в окне — тоже панель в `body`,
 * соседка окна, а не его потомок. Слой выше — по номеру `TFrame`
 * (`data-layer`) и тем же правилом, по которому `TDismissPlugin` считает
 * нажатие в такой список нажатием внутри (`isAboveLayer`): панель, в которую
 * можно нажать, не должна быть немой.
 *
 * **Что прячется** — соседи оставленных узлов и соседи их предков вплоть до
 * `body`. Вверх, а не только дети `body`: `TFrame` телепортируют и глубже
 * (`target`), и тогда соседи панели внутри своего контейнера — тоже фон.
 *
 * **Набор пересчитывается, а не снимается при открытии.** Скрытый `TFrame`
 * лежит в `body` уже смонтированным, а номер слоя пишет только показ, и
 * скрытие его не снимает: у скрытой панели номера нет или он остался от
 * прошлого показа. Список Select, открытый из окна, получает номер выше уже
 * при открытом окне. Поэтому, пока фон спрятан, `MutationObserver` на `body`
 * следит за составом поддерева и за `data-layer`: панель и её слой читаются
 * на каждом пересчёте заново, а в DOM пишется только разница.
 *
 * **Слоёв бывает несколько** — окно поверх окна прячет и нижнее вместе с
 * фоном, — поэтому пометка у узла одна на всех, со счётчиком (`marks.ts`):
 * закрытие одного окна не снимает пометок другого, в каком бы порядке их ни
 * закрывали, а последнее снятие возвращает то `aria-hidden`, что было у узла
 * до первой пометки. Свои пометки плагин снимает при закрытии, при
 * размонтировании корня и в `destroy()`.
 *
 * Открытость плагин ведёт сам — по свойству владельца (`property`, по
 * умолчанию `open`), как `TScrollLockPlugin`; вручную — `enabled` при
 * `property: null`. Документ берётся у корня, а не из `globalThis`:
 * компонент живёт и в `iframe`.
 *
 * Чего плагин не делает: `aria-modal` пишет в свой набор ядро окна — это
 * значение, а не операция; исключений для живых областей нет — фон
 * прячется целиком, как у нативного `<dialog>`.
 */
export class THideOutsidePlugin extends TBasePlugin<any, THideOutsidePluginEvents> {
	/** Умолчания опций, объявленных пропами, — см. `TDismissPlugin.defaultValues`. */
	static defaultValues: Required<Pick<IHideOutsidePluginOptions, 'enabled'>> = {
		enabled: false,
	}

	private _open: IOverlayOpenState | null = null
	private _dismiss: TDismissPlugin | null = null
	private _element: Element | null = null
	private _enabled = THideOutsidePlugin.defaultValues.enabled
	/** `body` под наблюдением; `null` — фон не спрятан. */
	private _body: HTMLElement | null = null
	private _observer: MutationObserver | null = null
	/** Узлы, которые пометил этот плагин: снимает он ровно их. */
	private readonly _hidden = new Set<Element>()

	override install(ctx: IPluginContext, options?: IHideOutsidePluginOptions): void {
		super.install(ctx, options)

		this._dismiss = ctx.get(TDismissPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._sync()
		})

		elementPlugin?.events.on('removed', () => {
			this._element = null
			this._sync()
		})

		this._enabled = options?.enabled ?? this._enabled

		this._open = bindOverlayOpen(ctx, options, (open) => {
			this.enabled = open
		})

		if (this._open) this.enabled = this._open.read()

		this._sync()
	}

	/**
	 * Спрятан ли фон. Владелец взводит это открытием; своё значение плагин
	 * держит и без корня — фон спрячется, как только корень объявят.
	 */
	get enabled(): boolean {
		return this._enabled
	}

	set enabled(value: boolean) {
		if (this._enabled === value) return

		this._enabled = value
		this._sync()
		this.events.emit('change:enabled', value)
	}

	override destroy(): void {
		this._enabled = false
		this._sync()

		this._observer = null
		this._element = null
		this._dismiss = null
		this._open = null

		super.destroy()
	}

	/** Фон спрятан ровно тогда, когда владелец открыт и корень объявлен. */
	private _sync(): void {
		const body = this._enabled ? (this._element?.ownerDocument.body ?? null) : null

		if (body !== this._body) {
			this._observer?.disconnect()
			this._body = body

			if (body) {
				this._observer ??= new MutationObserver(this._refresh)
				this._observer.observe(body, OBSERVED)
			}
		}

		this._refresh()
	}

	/** Пересчитать, что спрятать, и записать в DOM только разницу. */
	private readonly _refresh = (): void => {
		const next =
			this._body && this._element
				? this._outside(this._body, this._element)
				: new Set<Element>()

		for (const node of this._hidden) {
			if (next.has(node)) continue

			unmarkHidden(node)
			this._hidden.delete(node)
		}

		for (const node of next) {
			if (this._hidden.has(node)) continue

			markHidden(node)
			this._hidden.add(node)
		}
	}

	/** Фон панели: всё в `body`, кроме неё и слоёв выше неё. */
	private _outside(body: HTMLElement, root: Element): Set<Element> {
		const panel = this._dismiss?.findPanel() ?? root

		// Панели в странице нет — и прятать не от чего
		if (panel === body || !body.contains(panel)) return new Set()

		const above = [...body.querySelectorAll(`[${FRAME_LAYER_ATTRIBUTE}]`)].filter((node) =>
			isAboveLayer(node, panel),
		)

		return siblingsOutside(body, [panel, ...above])
	}
}

/**
 * Соседи оставленных узлов и их предков вплоть до `body` — то, что прячется,
 * чтобы доступными остались только они. Все оставленные лежат внутри `body`.
 *
 * Узел внутри другого оставленного отдельно не считается: он доступен вместе
 * с ним, и соседей внутри своего не прячет. Иначе слой, телепортированный в
 * панель окна, спрятал бы её содержимое.
 */
function siblingsOutside(body: Element, keep: readonly Element[]): Set<Element> {
	const kept = keep.filter(
		(node) => !keep.some((other) => other !== node && other.contains(node)),
	)
	/** Оставленные узлы и их предки ниже `body`: их самих не прячем. */
	const path = new Set<Element>()

	for (const node of kept) {
		for (
			let current: Element | null = node;
			current && current !== body;
			current = current.parentElement
		) {
			path.add(current)
		}
	}

	const hidden = new Set<Element>()

	for (const parent of [body, ...path]) {
		if (kept.includes(parent)) continue

		for (const child of parent.children) {
			if (!path.has(child)) hidden.add(child)
		}
	}

	return hidden
}
