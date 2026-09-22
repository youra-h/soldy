import type { ITabs, ITabsItem, TTabsCollection, TTabsOrientation } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { isFocusableElement } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TTabsKeyboardPluginEvents } from './types'

/**
 * Узел таба внутри узла элемента. Корень элемента — обёртка для темы, а табом
 * со своей ролью является вложенная строка: на неё и уходит фокус.
 */
const TAB_SELECTOR = '[role="tab"]'

/** Стрелки «к предыдущему» и «к следующему» — на оси ориентации списка. */
const AXIS_KEYS: Record<TTabsOrientation, readonly [back: string, forward: string]> = {
	horizontal: ['ArrowLeft', 'ArrowRight'],
	vertical: ['ArrowUp', 'ArrowDown'],
}

/**
 * TTabsKeyboardPlugin — клавиатура Tabs по паттерну APG Tabs.
 *
 * Стрелки по оси списка (у горизонтального ←/→, у вертикального ↑/↓) ведут к
 * соседнему табу по кругу, `Home`/`End` — к первому и последнему. Табы, на
 * которые нельзя перейти (`TTabsExtension.isEnabledTab`), пропускаются.
 * `Delete` закрывает таб, если его можно закрыть.
 *
 * **Активация автоматическая**: переход сразу активирует таб. APG советует
 * так, когда панель показывается без задержки, а `Tabs.Content` рисуется
 * локально. Поэтому фокус и активный таб не расходятся, и остановка Tab —
 * активный таб — считается в коллекции без знания о фокусе. `Enter` и пробел
 * здесь не обрабатываются: таб — нативная `<button>`, и активирует её клик.
 *
 * Сами `tabindex` плагин не пишет: roving tabindex ставит `TTabsExtension`,
 * потому что атрибут обязан стоять с первой отрисовки, включая серверную.
 * Здесь только то, что требует DOM: слушатель клавиш и перенос фокуса.
 *
 * От `TListNavigationPlugin` не наследуется: там модель подсветки при фокусе
 * на контейнере, а у табов по APG фокус ходит по самим табам (см. AGENTS.md,
 * «Граница переиспользования между похожими компонентами»).
 */
export class TTabsKeyboardPlugin extends TBasePlugin<ITabs, TTabsKeyboardPluginEvents> {
	private _owner: ITabs | null = null
	/** Корень: на нём слушатель, по нему же направление письма. */
	private _element: Element | null = null
	private _elements: TCollectionElements | null = null
	private _engine: TTabsCollection | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITabs>()
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._attach(element))
		elementPlugin?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
		})
	}

	override destroy(): void {
		this._detach()

		this._owner = null
		this._elements = null
		this._engine = null

		super.destroy()
	}

	private _attach(element: Element): void {
		this._detach()

		this._element = element

		const target: IDomEventTarget = element

		target.addEventListener('keydown', this._onKeyDown)
	}

	private _detach(): void {
		const target: IDomEventTarget | null = this._element

		target?.removeEventListener('keydown', this._onKeyDown)

		this._element = null
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		// С модификатором — чужой жест: Alt+← у браузера «назад»
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

		const engine = this._engine

		if (!engine) return

		const tab = this._tabOf(engine, event.target)

		if (!tab) return

		if (event.key === 'Delete') {
			this._close(engine, event, tab)

			return
		}

		const next = this._target(engine, event.key, tab)

		if (!next) return

		event.preventDefault()

		engine.extensions.activation.activate(next)
		this._focus(next)
	}

	/**
	 * Таб, с которого пришла клавиша, — тот, чей узел содержит цель события.
	 *
	 * Слушатель висит на корне, и до него всплывают клавиши панелей, слотов
	 * списка и вложенных Tabs: их перехватывать нельзя. Кнопка закрытия лежит
	 * внутри узла таба и считается его частью.
	 */
	private _tabOf(engine: TTabsCollection, target: EventTarget | null): ITabsItem | undefined {
		if (!(target instanceof Node)) return undefined

		return engine.extensions.batch.shown.find((item) =>
			this._elements?.getElementByUid(item.uid)?.contains(target),
		)
	}

	/** Куда ведёт клавиша; `undefined` — клавиша не наша. */
	private _target(engine: TTabsCollection, key: string, tab: ITabsItem): ITabsItem | undefined {
		if (key === 'Home') return this._available(engine)[0]

		if (key === 'End') return this._available(engine).at(-1)

		const step = this._step(key)

		return step === null ? undefined : this._neighbour(engine, tab, step)
	}

	/**
	 * Шаг по списку от стрелки; клавиши чужой оси не перехватываются. В RTL
	 * горизонтальный список идёт справа налево, и ←/→ меняются местами.
	 */
	private _step(key: string): number | null {
		const orientation = this._owner?.orientation ?? 'horizontal'
		const [back, forward] = AXIS_KEYS[orientation]
		const step = key === forward ? 1 : key === back ? -1 : null

		if (step === null || orientation === 'vertical') return step

		return this._rtl ? -step : step
	}

	/**
	 * Направление письма берётся вычисленным: `direction` компонента бывает
	 * `inherit`, и тогда его задаёт предок.
	 */
	private get _rtl(): boolean {
		return this._element !== null && getComputedStyle(this._element).direction === 'rtl'
	}

	/** Табы в порядке списка, на которые можно перейти. */
	private _available(engine: TTabsCollection): ITabsItem[] {
		return engine.extensions.batch.shown.filter((item) =>
			engine.extensions.tabs.isEnabledTab(item),
		)
	}

	/**
	 * Ближайший таб в направлении шага, по кругу: с последнего вперёд — на
	 * первый. Отсчёт от позиции таба в списке, а не среди доступных: таб могли
	 * выключить, пока на нём фокус.
	 */
	private _neighbour(
		engine: TTabsCollection,
		tab: ITabsItem,
		step: number,
	): ITabsItem | undefined {
		const shown = engine.extensions.batch.shown
		const count = shown.length
		const from = shown.indexOf(tab)

		for (let offset = 1; offset <= count; offset++) {
			const candidate = shown[(((from + step * offset) % count) + count) % count]

			if (engine.extensions.tabs.isEnabledTab(candidate)) return candidate
		}

		return undefined
	}

	/**
	 * `Delete` закрывает таб. Соседа закрытого активного активирует
	 * `TTabsExtension`, а фокус переходит туда, где теперь остановка Tab:
	 * узел закрытого таба уходит из документа вместе с фокусом.
	 *
	 * Удаление могли отменить в `item:remove:before` — `closeTab` об этом не
	 * знает, поэтому проверяется, остался ли таб в коллекции.
	 */
	private _close(engine: TTabsCollection, event: KeyboardEvent, tab: ITabsItem): void {
		const tabs = engine.extensions.tabs

		if (!tabs.closeTab(tab)) return

		event.preventDefault()

		if (engine.extensions.batch.items.includes(tab)) return

		const stop = tabs.tabStop

		if (stop) this._focus(stop)
	}

	/** Фокус на узел таба с ролью. Гард нужен: узел плагину приходит `Element`. */
	private _focus(item: ITabsItem): void {
		const tab = this._elements?.getElementByUid(item.uid)?.querySelector(TAB_SELECTOR)

		if (isFocusableElement(tab)) tab.focus()
	}
}
