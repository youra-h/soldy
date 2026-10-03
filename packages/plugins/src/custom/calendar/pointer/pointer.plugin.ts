import type {
	ICalendar,
	ICalendarPickerExtension,
	ICalendarViewExtension,
	TCalendarCollection,
} from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import type { IDomEventTarget } from '../../../utils'
import { dayOf, pagerOf, pickerPartOf } from '../parts'
import type { TCalendarPager, TCalendarPickerPart } from '../types'
import type { TCalendarPointerPluginEvents } from './types'

/** Листание по кнопке — команда вида коллекции. */
const PAGE: Readonly<Record<TCalendarPager, (view: ICalendarViewExtension) => void>> = {
	prev: (view) => view.showPrev(),
	next: (view) => view.showNext(),
}

/** Кнопки шапки панели выбора месяца и года — команды расширения `picker` для места. */
const PICK: Readonly<
	Record<TCalendarPickerPart, (picker: ICalendarPickerExtension, index: number) => void>
> = {
	prev: (picker, index) => picker.showPrev(index),
	next: (picker, index) => picker.showNext(index),
	heading: (picker, index) => picker.toggleLevel(index),
}

/**
 * TCalendarPointerPlugin — указатель календаря: нажатия по дням и кнопкам
 * листания и наведение для предпросмотра диапазона.
 *
 * Слушатели — на корне, в разметке обработчиков нет: связка «нажали ⇄
 * выбрали» и «нажали ⇄ листаем» повторялась бы в каждом из шести адаптеров
 * (приём ленты Scroller). Дат плагин не считает, только зовёт команды
 * расширений коллекции.
 *
 * - Нажатие по кнопке листания — `showPrev`/`showNext` вида. Enter и пробел на
 *   кнопке дают тот же `click` — браузер делает его у `<button>` сам.
 * - Нажатие по кнопке шапки панели выбора месяца и года — команда расширения
 *   `picker` для места панели: стрелки листают год или страницу лет, кнопка
 *   года меняет уровень. Панель — поповер внутри календаря (`contained`), и
 *   её нажатия всплывают до корня; выбор в её списке ловит само расширение.
 * - Нажатие по дню — где угодно в ячейке, с плиткой и содержимым слота, —
 *   `chooseDate` выбора. Недоступный и выключенный день выбор отклоняет сам,
 *   по заполнителю соседнего месяца не происходит ничего: дня у него нет.
 * - Наведение (не касание: палец над днём — это уже нажатие) — день под
 *   указателем для предпросмотра (`notifyHover`); указатель на не-дне или
 *   ушёл с корня — `undefined`.
 */
export class TCalendarPointerPlugin extends TBasePlugin<ICalendar, TCalendarPointerPluginEvents> {
	private _owner: ICalendar | null = null
	private _root: Element | null = null
	private _elements: TCollectionElements | null = null
	private _engine: TCalendarCollection | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ICalendar>() ?? null
		this._elements = ctx.get(TCollectionElements) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) => {
			this._engine = engine
		})
	}

	override destroy(): void {
		this._bind(null)

		this._owner = null
		this._elements = null
		this._engine = null

		super.destroy()
	}

	/** Корень сменился — вместе с ним переезжают слушатели. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('click', this._onClick)
		previous?.removeEventListener('pointerover', this._onPointerOver)
		previous?.removeEventListener('pointerleave', this._onPointerLeave)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('click', this._onClick)
		target?.addEventListener('pointerover', this._onPointerOver)
		target?.addEventListener('pointerleave', this._onPointerLeave)
	}

	private readonly _onClick = (event: MouseEvent): void => {
		const engine = this._engine
		const owner = this._owner
		const root = this._root

		if (!engine || !owner || !root) return

		const picker = engine.extensions.picker
		const hit = pickerPartOf(owner, picker.pickers, event.target)

		if (hit) {
			PICK[hit.part](picker, hit.index)

			return
		}

		const pager = pagerOf(owner, root, event.target)

		if (pager) {
			PAGE[pager](engine.extensions.view)

			return
		}

		const day = dayOf(engine, this._elements, event.target)

		if (day) engine.extensions.selection.chooseDate(day.item.date)
	}

	private readonly _onPointerOver = (event: PointerEvent): void => {
		const engine = this._engine

		if (!engine || event.pointerType === 'touch') return

		const day = dayOf(engine, this._elements, event.target)

		engine.extensions.selection.notifyHover(day?.item.date)
	}

	private readonly _onPointerLeave = (): void => {
		this._engine?.extensions.selection.notifyHover(undefined)
	}
}
