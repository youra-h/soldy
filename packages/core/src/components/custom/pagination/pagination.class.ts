import { TValueControl } from '../../base/value-control'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE, TAria } from '../../../common'
import { pageCount, pageKey, pagePosition, samePages } from './window'
import type {
	IPagination,
	IPaginationProps,
	TPaginationEvents,
	TPaginationPage,
	TPaginationValue,
} from './types'

/**
 * Пагинация — постраничная навигация: стрелки по краям, между ними — окно
 * страниц. Первая и последняя страницы видны всегда, между ними — страницы
 * вокруг текущей, на месте пропущенных — пропуск: `‹ 1 … 4 5 6 … 10 ›`.
 *
 * Сама пагинация держит то, что задаёт потребитель, — текущую страницу
 * (`value`), откуда берутся страницы и сколько их в середине окна, — и язык
 * номеров (`locale`), который с setup пишет плагин языка. Страницы окна —
 * элементы коллекции, текущая — её активация: состав, связь `value` с
 * текущей страницей, `aria-current` и раскладку окна с пропусками держит
 * расширение коллекции (`TPaginationExtension`).
 *
 * **Страницы — числовые или текстовые.** Без `pages` страниц
 * `⌈total / pageSize⌉`, ключ страницы — её номер. С `pages` страницы — список
 * приложения по порядку, ключ — `value` страницы, а без него — номер по месту.
 * Расчёт — чистые функции (`window.ts`): страниц у серверных данных бывают
 * десятки тысяч, и экземпляров на них нет.
 *
 * **Значение не прижимается** к страницам: страниц может не стать на время
 * (данные грузятся, `total` — 0), и `v-model` не должен терять страницу. Ключ
 * без страницы — текущей нет: окно с начала, обе стрелки выключены.
 *
 * **Стрелки** — `prev()` и `next()`; можно ли листать, отдают `prevDisabled` и
 * `nextDisabled`. Своего экземпляра у стрелок нет: их наборы (`prevAria`,
 * `nextAria`) держит пагинация, а имена от локали пишет плагин имён.
 *
 * Корень — `nav`: ориентир для скринридера. Имя ему даёт потребитель
 * (`aria_label`, `aria_labelledBy`): что листают — таблицу, ленту, результаты
 * поиска, — знает только приложение.
 */
export default class TPagination
	extends TValueControl<TPaginationValue, IPaginationProps, TPaginationEvents>
	implements IPagination
{
	static override baseClass = 'so-pagination'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IPaginationProps, 'total' | 'pageSize' | 'middleCount' | 'locale', 'pages'> =
		{
			...TValueControl.defaultValues,
			value: 1,
			total: 0,
			pageSize: 10,
			pages: undefined,
			middleCount: 3,
			locale: DEFAULT_LOCALE,
			tag: 'nav',
		}

	protected _total: number
	protected _pageSize: number
	protected _pages: TPaginationPage[] | undefined
	protected _middleCount: number
	protected _locale: string
	protected _prevAria: TAria
	protected _nextAria: TAria

	constructor(props: Partial<IPaginationProps> = {}) {
		super(props)

		const ctor = new.target as typeof TPagination

		this._total = props.total ?? ctor.defaultValues.total
		this._pageSize = props.pageSize ?? ctor.defaultValues.pageSize
		this._pages = props.pages ?? ctor.defaultValues.pages
		this._middleCount = props.middleCount ?? ctor.defaultValues.middleCount
		this._locale = props.locale ?? ctor.defaultValues.locale

		this._prevAria = new TAria()
		this._prevAria.events.on('change', () =>
			this.events.emit('change:prevAria', this._prevAria.toObject()),
		)

		this._nextAria = new TAria()
		this._nextAria.events.on('change', () =>
			this.events.emit('change:nextAria', this._nextAria.toObject()),
		)
	}

	get total(): number {
		return this._total
	}

	set total(value: number) {
		if (this._total === value) return

		this._total = value
		this.events.emit('change:total', value)
	}

	get pageSize(): number {
		return this._pageSize
	}

	set pageSize(value: number) {
		if (this._pageSize === value) return

		this._pageSize = value
		this.events.emit('change:pageSize', value)
	}

	get pages(): TPaginationPage[] | undefined {
		return this._pages
	}

	/**
	 * Список сверяется по тексту и ключу страниц, а не по ссылкам: эхо модели
	 * и литерал в разметке, собранный заново тем же составом, — не смена.
	 */
	set pages(value: TPaginationPage[] | undefined) {
		if (samePages(this._pages, value)) return

		this._pages = value
		this.events.emit('change:pages', value)
	}

	/** Как задано: окно прижимает его к числу страниц само (`middleOf`). */
	get middleCount(): number {
		return this._middleCount
	}

	set middleCount(value: number) {
		if (this._middleCount === value) return

		this._middleCount = value
		this.events.emit('change:middleCount', value)
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	/**
	 * Набор стрелки «назад». Своего экземпляра у стрелки нет — набор держит
	 * пагинация, как календарь — наборы кнопок листания. Живой: имя пишет
	 * плагин имён от локали, об изменении набор сообщает `change:prevAria`.
	 */
	get prevAria(): TAria {
		return this._prevAria
	}

	/** Набор стрелки «вперёд» — как у «назад». */
	get nextAria(): TAria {
		return this._nextAria
	}

	get prevDisabled(): boolean {
		return this.disabled || this._position <= 1
	}

	get nextDisabled(): boolean {
		const position = this._position

		return this.disabled || position === 0 || position >= pageCount(this)
	}

	prev(): void {
		if (this.prevDisabled) return

		this._goTo(this._position - 1)
	}

	next(): void {
		if (this.nextDisabled) return

		this._goTo(this._position + 1)
	}

	/** Место текущей страницы, с единицы; страницы со значением нет — 0. */
	protected get _position(): number {
		return pagePosition(this, this.value)
	}

	/** Сделать текущей страницу на месте `position` — записью значения. */
	protected _goTo(position: number): void {
		const key = pageKey(this, position)

		if (key !== undefined) this.value = key
	}

	override getProps(): IPaginationProps {
		return {
			...super.getProps(),
			total: this._total,
			pageSize: this._pageSize,
			pages: this._pages,
			middleCount: this._middleCount,
			locale: this._locale,
		}
	}
}
