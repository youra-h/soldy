import type { ITags, ITagsItem, TTagsCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TTagsKeyboardPluginEvents } from './types'

/**
 * Узел опции внутри узла тега. Корень элемента — пилюля для темы, а опцией со
 * своей ролью является вложенная строка: на неё и уходит фокус.
 */
const OPTION_SELECTOR = '[role="option"]'

/** Клавиши, которые закрывают тег. */
const CLOSE_KEYS = new Set(['Delete', 'Backspace'])

/**
 * TTagsKeyboardPlugin — клавиатура Tags с выбором по паттерну APG Listbox.
 *
 * Весь набор — одна остановка Tab (roving tabindex), по тегам ходят стрелки:
 * ←/→ (в RTL наоборот) и ↑/↓ — к соседнему тегу по кругу, `Home`/`End` — к
 * крайним. Теги, на которые нельзя перейти (`TTagsExtension.isEnabledTag`),
 * пропускаются. `Delete` и `Backspace` закрывают тег, если его можно закрыть,
 * и фокус переходит к соседу.
 *
 * **Фокус и выбор расходятся**, в отличие от Tabs: стрелка переносит только
 * фокус, выбирает пробел. `Enter` и пробел здесь не обрабатываются — строку
 * под фокусом переключает её собственный `press` (`TActionPlugin`). Поэтому
 * остановку Tab коллекция не может посчитать по одному выбору: `focusin` на
 * корне сообщает ей тег под фокусом (`notifyFocus`) — и от стрелок, и от
 * клика, и от `focus()` из кода.
 *
 * Слушатели висят, пока у набора включён выбор. В `none` строка — `listitem`
 * без действия, остановкой она не бывает, и перехватывать клавиши незачем.
 * Режим выражен подпиской на `change:mode`, а не проверкой в обработчике.
 *
 * Сами `tabindex` плагин не пишет: их ставит `TTagsExtension`, потому что
 * атрибут обязан стоять с первой отрисовки, включая серверную. Здесь только
 * то, что требует DOM: слушатели и перенос фокуса. Тег, на который ушёл
 * фокус, в окно ряда `scroll` доводит `TTagsScrollPlugin` (в ленте `arrows` —
 * плагин ленты) по `focusin`, который даёт и `focus()` этого плагина.
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

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._syncListeners()
		})

		elementPlugin?.events.on('removed', () => {
			this._element = null
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

		super.destroy()
	}

	/** Движок сменился — подписка на режим выбора переезжает вместе с ним. */
	private _bindEngine(engine: TTagsCollection | null): void {
		this._engine?.extensions.selection.events.off('change:mode', this._onModeChange)

		this._engine = engine

		engine?.extensions.selection.events.on('change:mode', this._onModeChange)

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

		if (CLOSE_KEYS.has(event.key)) {
			this._close(engine, event, tag)

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

	/**
	 * `Delete` и `Backspace` закрывают тег, и фокус переходит к соседу, а не
	 * в начало набора: узел закрытого тега уходит из документа вместе с
	 * фокусом.
	 *
	 * Соседа ищут до закрытия — после него места закрытого тега в наборе уже
	 * нет. Удаление могли отменить в `item:remove:before`: `closeTag` об этом
	 * не знает, поэтому проверяется, ушёл ли тег из коллекции.
	 */
	private _close(engine: TTagsCollection, event: KeyboardEvent, tag: ITagsItem): void {
		const neighbour = this._closeNeighbour(engine, tag)

		if (!engine.extensions.tags.closeTag(tag)) return

		event.preventDefault()

		const items = engine.extensions.batch.items

		if (items.includes(tag)) return

		if (neighbour && items.includes(neighbour)) this._focus(neighbour)
	}

	/**
	 * Сосед закрываемого тега, на который можно перейти: следующий по порядку
	 * набора, а у последнего — предыдущий.
	 */
	private _closeNeighbour(engine: TTagsCollection, tag: ITagsItem): ITagsItem | undefined {
		const shown = engine.extensions.batch.shown
		const index = shown.indexOf(tag)
		const available = (item: ITagsItem) => engine.extensions.tags.isEnabledTag(item)

		return (
			shown.slice(index + 1).find(available) ??
			shown.slice(0, index).reverse().find(available)
		)
	}

	/** Фокус на строку тега с ролью. Гард нужен: узел плагину приходит `Element`. */
	private _focus(item: ITagsItem): void {
		const option = this._elements?.getElementByUid(item.uid)?.querySelector(OPTION_SELECTOR)

		if (isFocusableElement(option)) option.focus()
	}
}
