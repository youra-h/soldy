import { TBaseExtension, batchOf } from '../../../../../base/collection'
import type { IActivationExtension, IExtensionContext } from '../../../../../base/collection'
import { pageCount, pageKey, pageNumber, pagePosition, pageWindow } from '../../../window'
import type { TPageWindowEntry } from '../../../window'
import type { IPaginationItem, IPaginationItemProps } from '../../../item/types'
import type { IPagination, TPaginationValue } from '../../../types'
import type {
	IPaginationExtension,
	TPaginationCell,
	TPaginationEngineOptions,
	TPaginationExtensionEvents,
} from './types'

/** Окна нет: пагинации нет или страниц ни одной. */
const NO_CELLS: ReadonlyArray<TPaginationCell> = Object.freeze([])

/**
 * TPaginationExtension — окно пагинации: какие страницы лежат в коллекции,
 * какая из них текущая и где между ними пропуски.
 *
 * Пагинация — опция движка (`owner`): она приходит и уходит после сборки, и
 * расширение наблюдает её (`ctx.options.watch`). Без пагинации нет ни окна,
 * ни текущей страницы.
 *
 * **В коллекции — только страницы окна**: первая, середина вокруг текущей и
 * последняя, не больше «середина + 2». Страниц у серверных данных бывают
 * десятки тысяч, и экземпляр на каждую расходовал бы память впустую. Состав
 * пишет расширение (`batch.update`) на каждую смену того, из чего окно
 * считается: значения, страниц, середины и локали (номер — в цифрах локали).
 * Сверка — по ключу страницы (`trackBy`), поэтому страница, оставшаяся на
 * экране, — тот же экземпляр: узел и фокус на нём переживают сдвиг окна.
 *
 * **Окно для разметки** — `cells`: страницы и пропуски по порядку. Пропуск —
 * разметка владельца, а не элемент: на нём ничего не нажимают. Порядок
 * страниц в хранилище с окном не совпадает (сверка дописывает новые в
 * конец), поэтому разметка рисует `cells`, а не состав.
 *
 * **Текущая страница — активация коллекции**, связь с `value` пагинации — в
 * обе стороны. Нажали страницу — значение; записали значение — окно вокруг
 * него и его страница текущая. Значение — главное: страницы, ушедшей из окна
 * или из страниц вовсе, оно не теряет — активация снимается, а значение
 * остаётся. Снятая на месте (кодом) текущая возвращается к странице
 * значения: у пагинации текущая страница есть всегда, пока есть страница
 * значения. Отмена в `item:activate:before` или `change:value:before`
 * значение и текущую не разводит: отменили страницу значения — значение
 * возвращается к прежнему, отменили или поправили запись значения — текущей
 * становится страница значения.
 *
 * **Что страница знает от пагинации**: размер и вариант — всегда её,
 * «выключена» — как у `<fieldset>`, `aria-current="page"` — у текущей.
 * `data-selected` текущей пишет сама активация.
 */
export class TPaginationExtension
	extends TBaseExtension<IPaginationItem, TPaginationExtensionEvents, TPaginationEngineOptions>
	implements IPaginationExtension
{
	readonly name = 'pagination' as const

	/**
	 * Идёт синхронизация `value` ⇄ текущая страница. Флаг, а не сравнение
	 * значений: сброс текущей при значении без страницы тоже шлёт
	 * `item:deactivated`, и сравнение вернуло бы его в синхронизацию.
	 */
	private _syncing = false

	private _cells: ReadonlyArray<TPaginationCell> = NO_CELLS

	get cells(): ReadonlyArray<TPaginationCell> {
		return this._cells
	}

	override install(ctx: IExtensionContext<IPaginationItem, TPaginationEngineOptions>): void {
		super.install(ctx)

		// Состав сверяется по ключу страницы: и у страницы в хранилище, и у
		// источника он есть
		const batch = batchOf(ctx)

		if (batch) batch.trackBy = (item) => item.value

		// После вставки на месте источника уже инстанс: `TFactoryExtension`
		// подменяет его в `item:add:before`
		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as IPaginationItem))

		// Сверка пишет странице своё из данных — свойства пагинации поверх
		ctx.driver.events.on('item:updated', (e) => this._applyOwner(e.item))

		const activation = this._activation

		if (activation) {
			// `aria-current` — всем на смену текущей, добавленной — только ей
			activation.events.on('change:activation', () => this._syncCurrent(activation))
			ctx.driver.events.on('item:added', (e) =>
				this._applyCurrent(e.item as IPaginationItem, activation),
			)

			activation.events.on('item:activated', () => this._activationToValue())

			activation.events.on('item:deactivated', (item) => {
				// Ушла из коллекции — окно сдвинулось или страниц стало меньше:
				// значение остаётся
				if (!item || !ctx.driver.valueOf().includes(item)) return

				// Сняли на месте, кодом: текущая — страница значения
				this._valueToActivation()
			})
		}

		// Пагинация — опция движка: приходит и уходит после сборки. Подписки на
		// неё живут в области наблюдателя — сменилась пагинация, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) {
				this._setCells(NO_CELLS)

				return
			}

			// Догон: страницы, лежавшие до прихода пагинации
			ctx.driver.valueOf().forEach((item) => this._applyOwner(item))

			this._rebuild(owner)

			scope.on(owner.events, 'change:value', ({ oldValue }) => this._onValue(owner, oldValue))

			const rebuild = (): void => this._rebuild(owner)

			scope.on(owner.events, 'change:total', rebuild)
			scope.on(owner.events, 'change:pageSize', rebuild)
			scope.on(owner.events, 'change:pages', rebuild)
			scope.on(owner.events, 'change:middleCount', rebuild)
			// Номер — в цифрах локали: страницы те же, текст новый
			scope.on(owner.events, 'change:locale', rebuild)

			// Смена у пагинации — всем страницам: `disabled` распространяется на
			// них, как у `<fieldset>`, `size` и `variant` диктует она
			scope.on(owner.events, 'change:disabled', (value: boolean) => {
				ctx.driver.valueOf().forEach((item) => {
					item.disabled = value
				})
			})
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item, owner)),
			)
			scope.on(owner.events, 'change:variant', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item, owner)),
			)
		})
	}

	private get _activation(): IActivationExtension<IPaginationItem> | undefined {
		return this._ctx.extensions.activation as IActivationExtension<IPaginationItem> | undefined
	}

	/** Окно заново и текущая — по значению. */
	private _rebuild(owner: IPagination): void {
		this._build(owner)
		this._valueToActivation()
	}

	/**
	 * Значение сменилось. Окно — вокруг нового значения, кто бы его ни записал.
	 * Записали из текущей страницы — она уже та. Иначе текущей становится
	 * страница значения, а отменили её в `item:activate:before` — значение
	 * возвращается к прежнему, к странице, которая была текущей: страница
	 * значения, ушедшая из окна, иначе оставила бы пагинацию без текущей.
	 */
	private _onValue(owner: IPagination, oldValue: TPaginationValue): void {
		this._build(owner)

		if (this._syncing || this._valueToActivation()) return

		this._sync(() => {
			owner.value = oldValue
		})

		// Отменили и возврат — текущая остаётся какой была: второй круг отмен
		// ничего не прояснит
		this._valueToActivation()
	}

	/**
	 * Текущая страница → `value`. Текущей нет — значение остаётся: страница
	 * ушла из коллекции, а не выбрали «ничего».
	 *
	 * Запись отменили или поправили в `change:value:before` — текущей
	 * становится страница значения: иначе пагинация показывала бы текущей
	 * одну страницу, а значением держала другую.
	 */
	private _activationToValue(): void {
		const owner = this._ctx.options.get('owner')
		const page = this._activation?.activeItem

		if (!owner || !page || this._syncing) return

		this._sync(() => {
			owner.value = page.value
		})

		if (owner.value !== page.value) this._valueToActivation()
	}

	/**
	 * `value` → текущая страница. Страницы значения нет — текущей нет, а
	 * значение остаётся: страница может вернуться (`total` вырос, окно
	 * сдвинулось).
	 *
	 * @returns стала ли страница значения текущей: `false` — её отменили в
	 * `item:activate:before`
	 */
	private _valueToActivation(): boolean {
		const activation = this._activation
		const owner = this._ctx.options.get('owner')

		if (!activation || !owner || this._syncing) return true

		const value = owner.value
		const page = this._ctx.driver.valueOf().find((item) => item.value === value)

		let accepted = true

		this._sync(() => {
			if (page) accepted = activation.activate(page)
			else activation.reset()
		})

		return accepted
	}

	/** Действие синхронизации: события, которые оно вызовет, синхронизацию не запускают. */
	private _sync(action: () => void): void {
		this._syncing = true

		try {
			action()
		} finally {
			this._syncing = false
		}
	}

	/**
	 * Состав коллекции — страницы окна, по ключу, и окно для разметки.
	 * Пагинация без страниц (`pages` — пустой список) — пустая коллекция.
	 */
	private _build(owner: IPagination): void {
		const plan = pageWindow(
			pageCount(owner),
			pagePosition(owner, owner.value),
			owner.middleCount,
		)
		const sources: Partial<IPaginationItemProps>[] = []

		for (const entry of plan) {
			if (entry.kind !== 'page') continue

			const key = pageKey(owner, entry.position)

			if (key !== undefined)
				sources.push({ value: key, text: this._text(owner, entry.position) })
		}

		batchOf(this._ctx)?.update(sources)

		this._setCells(this._cellsOf(owner, plan))
	}

	/** Ключ страницы места окна; у пропуска ключа нет. */
	private _keyOf(owner: IPagination, entry: TPageWindowEntry): TPaginationValue | undefined {
		return entry.kind === 'page' ? pageKey(owner, entry.position) : undefined
	}

	/** Текст страницы: номер в цифрах локали или текст страницы из `pages`. */
	private _text(owner: IPagination, position: number): string {
		return owner.pages ? owner.pages[position - 1].text : pageNumber(position, owner.locale)
	}

	/**
	 * Окно для разметки: места окна — страницами коллекции по ключу, пропуски
	 * — с ключом страницы за ними. Страница, вставку которой отменили
	 * (`item:add:before`), места не получает.
	 */
	private _cellsOf(
		owner: IPagination,
		plan: readonly TPageWindowEntry[],
	): ReadonlyArray<TPaginationCell> {
		const byKey = new Map(this._ctx.driver.valueOf().map((item) => [item.value, item]))
		const pages = plan.map((entry) => {
			const key = this._keyOf(owner, entry)

			return key === undefined ? undefined : byKey.get(key)
		})
		const cells: TPaginationCell[] = []

		plan.forEach((entry, index) => {
			const page = pages[index]

			if (entry.kind === 'page') {
				if (page) cells.push({ kind: 'item', key: page.uid, item: page })

				return
			}

			// За пропуском страница есть всегда: последняя видна всегда
			const next = pages[index + 1]

			if (next) cells.push({ kind: 'ellipsis', key: -next.uid })
		})

		return cells
	}

	/** Записать окно; событие — только на смену. */
	private _setCells(cells: ReadonlyArray<TPaginationCell>): void {
		if (sameCells(this._cells, cells)) return

		this._cells = cells
		this.events.emit('change:cells', cells)
	}

	/**
	 * Свойства пагинации на странице: `size` и `variant` — всегда её,
	 * `disabled` — когда она выключена.
	 */
	private _applyOwner(item: IPaginationItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applyStyle(item, owner)

		if (owner.disabled) item.disabled = true
	}

	/** `size` и `variant` страницы — всегда пагинации. */
	private _applyStyle(item: IPaginationItem, owner: IPagination): void {
		item.size = owner.size
		item.variant = owner.variant
	}

	/** `aria-current="page"` — всем страницам по текущей. */
	private _syncCurrent(activation: IActivationExtension<IPaginationItem>): void {
		this._ctx.driver.valueOf().forEach((item) => this._applyCurrent(item, activation))
	}

	/**
	 * `aria-current="page"` одной странице: текущей — есть, остальным — нет.
	 * Атрибут знает паттерн, а не механизм активации: у таба та же активность —
	 * `aria-selected`.
	 */
	private _applyCurrent(
		item: IPaginationItem,
		activation: IActivationExtension<IPaginationItem>,
	): void {
		item.aria.add('aria-current', activation.isActive(item) ? 'page' : null)
	}
}

/** То же окно: те же страницы и пропуски с теми же ключами тем же порядком. */
function sameCells(a: ReadonlyArray<TPaginationCell>, b: ReadonlyArray<TPaginationCell>): boolean {
	return (
		a.length === b.length &&
		a.every((cell, index) => {
			const other = b[index]

			if (cell.kind === 'item') return other.kind === 'item' && other.item === cell.item

			return other.kind === 'ellipsis' && other.key === cell.key
		})
	)
}
