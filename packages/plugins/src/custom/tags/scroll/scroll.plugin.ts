import type { ITags } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { itemOf, nearestShift, scrollWindowOf } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TTagsScrollPluginEvents } from './types'

/**
 * TTagsScrollPlugin — доводка элемента под фокусом в ряду тегов `scroll`.
 *
 * Ряд `scroll` прокручивается сам, и у его края элемент под фокусом оставался
 * срезанным: частично видимый браузер при фокусе не докручивает вовсе, а
 * целиком скрытый ставит по центру — и тогда срезанным остаётся его тег.
 * Поэтому по `focusin` тег под фокусом в окно ряда доводит плагин. Окно —
 * паддинг-бокс ряда без `scroll-padding` (`scrollWindowOf`): сколько места
 * держать у края, знает только тема — у самостоятельного ряда это запас под
 * кольцо фокуса, в поле Select — ширина подсказки. Счёт — общая доводка
 * (`nearestShift`), та же, что у ленты `arrows`.
 *
 * Плагин, а не расширение или разметка: и прямоугольники, и прокрутка — это
 * операции над DOM. Решения:
 * - в окно встаёт тег — прямой ребёнок ряда, а не сам элемент под фокусом.
 *   Фокус получает строка тега или его крестик, а кольцо фокуса в режиме
 *   выбора рисует пилюля: со строкой в окне и пилюлей за краем кольцо и
 *   крестик оставались бы срезанными. А крестик без подписи не скажет, какой
 *   тег он закроет. Тег шире окна накрывает окно, а элемент под фокусом лежит
 *   в окне;
 * - сдвиг — ближайший, при котором тег в окне, а не «начало к началу», как у
 *   ленты: снапа у ряда нет, и ставить тег к началу окна незачем;
 * - только фокус с клавиатуры (`:focus-visible`). Фокус от нажатия мышью
 *   браузер сам не докручивает, и правильно: сдвинься ряд между нажатием и
 *   отпусканием, под указателем оказался бы другой тег, и `click` не дошёл бы;
 * - сдвиг синхронный, прямо в обработчике, и мгновенный (`instant`), как у
 *   ленты (`TScrollerViewportPlugin`). Свою докрутку фокуса браузер делает
 *   тоже мгновенно и плавную анимацию перебил бы. При переходе Tab он
 *   докручивает ещё до `focusin`, после `focus()` — сразу за ним, и после
 *   нашего сдвига ему уже нечего делать.
 *
 * Путь у доводки один: тег доводит только этот плагин — и при входе в набор
 * по Tab, и после `focus()` плагина клавиатуры (`TTagsKeyboardPlugin`:
 * стрелки, `Home`/`End`, сосед закрытого тега). Своей докрутки у плагина
 * клавиатуры нет: `focus()` после нажатия клавиши браузер считает фокусом с
 * клавиатуры, и `focusin` приходит сюда с `:focus-visible`.
 *
 * Слушает, только пока `overflow === 'scroll'`: в `wrap` и `popover` ряд не
 * прокручивается, а в `arrows` фокус доводит лента. Режим выражен подпиской,
 * а не проверкой внутри обработчика.
 */
export class TTagsScrollPlugin extends TBasePlugin<ITags, TTagsScrollPluginEvents> {
	/** Корень набора: в `scroll` он и есть прокручиваемый ряд. */
	private _root: Element | null = null
	/** Узел, на котором слушатель висит сейчас; `null` — не висит. */
	private _listening: IDomEventTarget | null = null
	private _owner: ITags | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITags>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => {
			this._root = node
			this._syncListener()
		})

		element?.events.on('removed', () => {
			this._root = null
			this._syncListener()
		})

		this._listenTo(this._owner?.events, 'change:overflow', this._onOverflowChange)
	}

	override destroy(): void {
		this._root = null
		this._syncListener()
		this._owner = null

		super.destroy()
	}

	private readonly _onOverflowChange = (): void => this._syncListener()

	/** Слушатель висит на корне, пока узел есть и ряд прокручивается сам. */
	private _syncListener(): void {
		const target: IDomEventTarget | null =
			this._owner?.overflow === 'scroll' ? this._root : null

		if (target === this._listening) return

		this._listening?.removeEventListener('focusin', this._onFocusIn)

		this._listening = target

		target?.addEventListener('focusin', this._onFocusIn)
	}

	/**
	 * Фокус с клавиатуры пришёл в ряд — довести его тег в окно (почему так — в
	 * описании плагина).
	 *
	 * Сам ряд бывает остановкой Tab, когда своих в нём нет: браузер делает её у
	 * прокручиваемой области. Он и есть окно, и доводить его некуда.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const root = this._root
		const target = event.target

		if (!root || !(target instanceof Element) || target === root) return

		if (!target.matches(':focus-visible')) return

		const shift = nearestShift({
			scrollWindow: scrollWindowOf(root, getComputedStyle(root)),
			focused: target.getBoundingClientRect(),
			item: itemOf(target, root).getBoundingClientRect(),
		})

		if (shift !== null) root.scrollBy({ left: shift, behavior: 'instant' })
	}
}
