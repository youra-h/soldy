import type { ITags, ITagsItem, TTagsCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TLeavingFocus } from '../../collection/leaving-focus'
import { focusFirst, isFocusableElement, tabStopsAfter } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import { tagOf, tagStopIn } from '../tag'
import type { TTagsKeyboardPluginEvents } from './types'

/** Клавиши, которые закрывают тег. */
const CLOSE_KEYS = new Set(['Delete', 'Backspace'])

/**
 * TTagsKeyboardPlugin — клавиатура Tags с выбором по паттерну APG Listbox и
 * фокус после закрытия тега в любом режиме.
 *
 * Весь набор — одна остановка Tab (roving tabindex), по тегам ходят стрелки:
 * ←/→ (в RTL наоборот) и ↑/↓ — к соседнему тегу по кругу, `Home`/`End` — к
 * крайним. Теги, на которые нельзя перейти (`TTagsExtension.isEnabledTag`),
 * пропускаются. `Delete` и `Backspace` закрывают тег, если его можно закрыть.
 *
 * **Фокус и выбор расходятся**, в отличие от Tabs: стрелка переносит только
 * фокус, выбирает пробел. `Enter` и пробел здесь не обрабатываются — строку
 * под фокусом переключает её собственный `press` (`TActionPlugin`). Поэтому
 * остановку Tab коллекция не может посчитать по одному выбору: `focusin` на
 * корне сообщает ей тег под фокусом (`notifyFocus`) — и от стрелок, и от
 * клика, и от `focus()` из кода.
 *
 * Слушатели клавиш висят, пока у набора включён выбор. В `none` строка —
 * `listitem` без действия, остановкой она не бывает, и перехватывать клавиши
 * незачем. Режим выражен подпиской на `change:mode`, а не проверкой в
 * обработчике.
 *
 * **Закрытый тег отдаёт фокус соседу** — в любом режиме и любым закрытием:
 * клавишей, крестиком, из кода. Узел тега уходит из документа, и фокус,
 * стоявший в нём, ушёл бы на страницу: следующий Tab начинал бы обход
 * заново, а в поле Select стрелки прокручивали бы страницу. Переносится
 * только фокус из узла закрываемого тега — к следующему соседу, у последнего
 * к предыдущему, недоступные и без остановки пропускаются, — на его остановку
 * (`tagStopIn`): с выбором — строку, без выбора — крестик. Соседа нет — к
 * первой остановке Tab после ряда и вне его: в поле Select ряд стоит перед
 * полем ввода, и фокус встаёт в поле без своего правила Select. Нет и её —
 * фокус не трогается.
 *
 * Где фокус и кто соседи, видно только до удаления: после него узла тега нет
 * в реестре, а места — в наборе. Когда переносить фокус, решает помощник
 * коллекции (`TLeavingFocus`), общий с Tabs: он снимает фокус и соседей и на
 * закрытии, и в хуке удаления, а переносит тем из фактов «закрыли» и «ушёл»,
 * что пришёл вторым. Порядок у них разный: набор удаляет тег сам, следом за
 * `item:close`, а поле Select снимает выбор с опции ещё в своём обработчике
 * `item:close`, раньше плагина, — и её тег уходит до того, как закрытие
 * дойдёт сюда. Удаление, отменённое в `item:remove:before`, фокус не трогает.
 * Тег, ушедший без закрытия, — снятый из данных или размонтированный, — фокус
 * не переносит: иначе ряд, который снимают целиком, гонял бы фокус по своим
 * уходящим тегам. Здесь — только кто соседи и куда идёт фокус.
 *
 * Сами `tabindex` плагин не пишет: их ставит `TTagsExtension`, потому что
 * атрибут обязан стоять с первой отрисовки, включая серверную. Здесь только
 * то, что требует DOM: слушатели и перенос фокуса. Тег, на который ушёл
 * фокус, в окно ряда `scroll` доводит `TTagsScrollPlugin` по `focusin`,
 * который даёт и `focus()` этого плагина. Закрыть тег из кода можно и на
 * сервере, поэтому фокус читается только при узле корня.
 *
 * От `TListNavigationPlugin` не наследуется: там фокус на контейнере и
 * подсветка через `aria-activedescendant`, а здесь фокус ходит по самим
 * тегам — у каждого свой крестик (см. AGENTS.md, «Граница переиспользования
 * между похожими компонентами»).
 */
export class TTagsKeyboardPlugin extends TBasePlugin<ITags, TTagsKeyboardPluginEvents> {
	/** Корень: на нём слушатели, по нему же направление письма. */
	private _element: Element | null = null
	/** Узел, на котором слушатели висят сейчас; `null` — не висят. */
	private _listening: IDomEventTarget | null = null
	private _elements: TCollectionElements | null = null
	private _engine: TTagsCollection | null = null
	/** Фокус закрываемого тега — ждёт, пока тег закроют и он уйдёт из набора. */
	private _leaving: TLeavingFocus<ITagsItem, readonly ITagsItem[]> | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._elements = ctx.get(TCollectionElements) ?? null
		this._leaving = new TLeavingFocus(this._elements, {
			root: () => this._element,
			place: (tag) => this._neighbours(tag),
			pass: (root, neighbours) => this._pass(root, neighbours),
		})

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._syncListeners()
		})

		elementPlugin?.events.on('removed', () => {
			this._element = null
			this._leaving?.reset()
			this._syncListeners()
		})

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) =>
			this._bindEngine(engine),
		)
	}

	override destroy(): void {
		this._element = null
		this._bindEngine(null)

		this._elements = null
		this._leaving = null

		super.destroy()
	}

	/**
	 * Движок сменился — подписки на режим выбора, закрытие и удаление тегов
	 * переезжают вместе с ним. Закрытие и удаление слушаются в любом режиме:
	 * фокус после закрытия переносится и без выбора.
	 */
	private _bindEngine(engine: TTagsCollection | null): void {
		const previous = this._engine?.extensions

		previous?.selection.events.off('change:mode', this._onModeChange)
		previous?.tags.events.off('item:close', this._onClose)

		this._engine = engine

		const extensions = engine?.extensions

		extensions?.selection.events.on('change:mode', this._onModeChange)
		extensions?.tags.events.on('item:close', this._onClose)
		this._leaving?.bind(extensions?.plain ?? null)

		this._syncListeners()
	}

	private readonly _onModeChange = (): void => this._syncListeners()

	/** Слушатели висят на корне, пока узел есть и у набора включён выбор. */
	private _syncListeners(): void {
		const selecting = (this._engine?.extensions.selection.mode ?? 'none') !== 'none'
		const target: IDomEventTarget | null = selecting ? this._element : null

		if (target === this._listening) return

		this._listening?.removeEventListener('keydown', this._onKeyDown)
		this._listening?.removeEventListener('focusin', this._onFocusIn)

		this._listening = target

		target?.addEventListener('keydown', this._onKeyDown)
		target?.addEventListener('focusin', this._onFocusIn)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		// С модификатором — чужой жест: Alt+← у браузера «назад»
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

		const engine = this._engine

		if (!engine) return

		const tag = this._tagOf(engine, event.target)

		if (!tag) return

		// Фокус соседу передаёт само закрытие — тем же путём, что у крестика
		if (CLOSE_KEYS.has(event.key)) {
			if (engine.extensions.tags.closeTag(tag)) event.preventDefault()

			return
		}

		const next = this._target(engine, event.key, tag)

		if (!next) return

		event.preventDefault()

		this._focus(next)
	}

	/**
	 * Фокус пришёл на тег — остановка Tab переходит к нему. Один путь для
	 * стрелок (их `focus()` тоже даёт `focusin`), клика и фокуса из кода.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const engine = this._engine

		if (!engine) return

		const tag = this._tagOf(engine, event.target)

		if (tag) engine.extensions.tags.notifyFocus(tag)
	}

	/**
	 * Тег, с которого пришло событие, — тот, чей узел содержит его цель.
	 *
	 * Слушатель висит на корне, и до него всплывают события содержимого слота
	 * набора (поле ввода нового тега и т. п.): их перехватывать нельзя. Кнопка
	 * закрытия лежит внутри узла тега и считается его частью.
	 */
	private _tagOf(engine: TTagsCollection, target: EventTarget | null): ITagsItem | undefined {
		if (!(target instanceof Node)) return undefined

		return engine.extensions.batch.shown.find((item) =>
			this._elements?.getElementByUid(item.uid)?.contains(target),
		)
	}

	/** Куда ведёт клавиша; `undefined` — клавиша не наша. */
	private _target(engine: TTagsCollection, key: string, tag: ITagsItem): ITagsItem | undefined {
		if (key === 'Home') return this._available(engine)[0]

		if (key === 'End') return this._available(engine).at(-1)

		const step = this._step(key)

		return step === null ? undefined : this._neighbour(engine, tag, step)
	}

	/**
	 * Шаг по набору от стрелки. Теги идут в ряд с переносом, поэтому ↑/↓ —
	 * тоже шаг по порядку. В RTL ряд идёт справа налево, и ←/→ меняются
	 * местами.
	 */
	private _step(key: string): number | null {
		switch (key) {
			case 'ArrowUp':
				return -1
			case 'ArrowDown':
				return 1
			case 'ArrowLeft':
				return this._rtl ? 1 : -1
			case 'ArrowRight':
				return this._rtl ? -1 : 1
			default:
				return null
		}
	}

	/**
	 * Направление письма берётся вычисленным: `direction` компонента бывает
	 * `inherit`, и тогда его задаёт предок.
	 */
	private get _rtl(): boolean {
		return this._element !== null && getComputedStyle(this._element).direction === 'rtl'
	}

	/** Теги в порядке набора, на которые можно перейти. */
	private _available(engine: TTagsCollection): ITagsItem[] {
		return engine.extensions.batch.shown.filter((item) =>
			engine.extensions.tags.isEnabledTag(item),
		)
	}

	/**
	 * Ближайший тег в направлении шага, по кругу: с последнего вперёд — на
	 * первый. Отсчёт от позиции тега в наборе, а не среди доступных: тег могли
	 * выключить, пока на нём фокус.
	 */
	private _neighbour(
		engine: TTagsCollection,
		tag: ITagsItem,
		step: number,
	): ITagsItem | undefined {
		const shown = engine.extensions.batch.shown
		const count = shown.length
		const from = shown.indexOf(tag)

		for (let offset = 1; offset <= count; offset++) {
			const candidate = shown[(((from + step * offset) % count) + count) % count]

			if (engine.extensions.tags.isEnabledTag(candidate)) return candidate
		}

		return undefined
	}

	/** Фокус на строку тега с ролью. Гард нужен: узел плагину приходит `Element`. */
	private _focus(item: ITagsItem): void {
		const option = tagOf(this._elements, item.uid)

		if (isFocusableElement(option)) option.focus()
	}

	/**
	 * Тег закрывают — любым путём: клавишей, крестиком, из кода. Переносить
	 * ли фокус, решает помощник: фокус мог стоять и не в этом теге.
	 */
	private readonly _onClose = (tag: ITagsItem): void => this._leaving?.close(tag)

	/**
	 * Соседи тега в порядке, в котором им отдаётся фокус: следующие за ним в
	 * наборе от ближнего, затем предыдущие от ближнего.
	 */
	private _neighbours(tag: ITagsItem): readonly ITagsItem[] {
		const shown = this._engine?.extensions.batch.shown ?? []
		const index = shown.indexOf(tag)

		return [...shown.slice(index + 1), ...shown.slice(0, Math.max(index, 0)).reverse()]
	}

	/**
	 * Фокус — на остановку ближайшего соседа, на которого можно перейти, а
	 * нет такого — на первую остановку Tab после ряда.
	 */
	private _pass(root: Element, neighbours: readonly ITagsItem[]): void {
		const engine = this._engine

		if (!engine) return

		const { batch, tags } = engine.extensions
		const present = new Set(batch.items)
		const stops: Element[] = []

		for (const neighbour of neighbours) {
			if (!present.has(neighbour) || !tags.isEnabledTag(neighbour)) continue

			const stop = tagStopIn(this._elements?.getElementByItem(neighbour) ?? null)

			if (stop) stops.push(stop)
		}

		if (focusFirst(stops)) return

		focusFirst(tabStopsAfter(root, null))
	}
}
