import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import { TSelectEvent } from './types'
import type { TSelectionEvents, TSelectionMode, ISelectionExtension } from './types'
import type { ISelectionItemExtension } from './item'
import { TSelectionItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'
import type { TMetaExtension } from '../meta'
import type { TDataset } from '../../../../../../common'
import { sameValue } from '../../../../../../common/utility/same-value'

/**
 * TSelectionExtension — расширение для управления выборкой элементов.
 *
 * Поддерживает режимы:
 * - `'none'` — выделение запрещено
 * - `'single'` — только один элемент
 * - `'multiple'` — любое количество элементов
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TSelectionExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<TItem, ISelectionItemExtension<TItem>, TSelectionEvents<TItem>>
	implements IExtension<TItem>, ISelectionExtension<TItem>
{
	readonly name = 'selection' as const

	private _selected: Set<TItem> = new Set()
	private _mode: TSelectionMode = 'single'
	/** Запись удалила выбранный элемент — объявить на её `change:items`. */
	private _lostOnWrite = false

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, ISelectionItemExtension<TItem>>) {
		super(TSelectionItemExtension, options)
	}

	get mode(): TSelectionMode {
		return this._mode
	}

	set mode(value: TSelectionMode) {
		if (this._mode === value) return

		const wasMultiple = this._mode === 'multiple'

		if (value === 'none') {
			// полностью очистить выбор
			this.resetSelection()
		}

		this._mode = value

		// `multiple` -> `single` снимает выбор целиком, а не урезает до одного:
		// оставить какой-то из выбранных значило бы выбрать за пользователя.
		// Сброс после смены режима — `change:selection` видит уже `single`.
		// `single` -> `multiple` выбор не трогает
		if (value === 'single' && wasMultiple) this.resetSelection()

		this.events.emit('change:mode', value)
	}

	get multiple(): boolean {
		return this._mode === 'multiple'
	}

	get single(): boolean {
		return this._mode === 'single'
	}

	install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Всем — на смену выбора, добавленному — только ему: пачка шлёт
		// `item:added` на каждый элемент разом в конце, и проход по всем на
		// каждый из них сделал бы наполнение квадратичным. Выбор остальных
		// элементов запись состава не меняет — прохода на `change:items` нет
		this.events.on('change:selection', () => this._syncDataset())
		ctx.driver.events.on('item:added', (e) => this._writeDataset(e.item as TItem))
		this._syncDataset()

		// Любое удаление из хранилища — команда с `item:removed`, в том числе
		// очистка и сверка `patch`: здесь выбор и теряет удалённый элемент.
		// Потерю выбор объявляет, как активация — снятие удалённого активного,
		// но раз на запись: запись удаляет пачкой, и `change:selection` на
		// каждый удалённый выбранный прогнал бы подписчиков выбора по всей
		// коллекции столько раз. `change:items` приходит следом за всеми
		// `item:removed` каждой записи — команды и пачки
		ctx.driver.events.on('item:removed', (e) => {
			if (this._selected.delete(e.item)) this._lostOnWrite = true
		})

		ctx.driver.events.on('change:items', () => {
			if (!this._lostOnWrite) return

			this._lostOnWrite = false
			this._notifySelected()
		})

		ctx.driver.events.on('reset', () => {
			this.resetSelection()
		})

		const meta = ctx.extensions.meta as TMetaExtension<TItem> | undefined

		if (meta) {
			const applyMeta = (item: TItem, m: Record<string, unknown>) => {
				if (!m.selected) return

				this.select(item)
			}

			meta.events.on('meta:applied', applyMeta)
			meta.events.on('meta:changed', applyMeta)

			// Догон: расширение могло прийти в уже наполненную коллекцию, и свои
			// `meta:applied` оно тогда пропустило. Снимок помнит `meta`
			ctx.driver.valueOf().forEach((item) => {
				const remembered = meta.get?.(item)

				if (remembered) applyMeta(item, remembered)
			})
		}
	}

	/**
	 * Зеркалит выбор в `data-selected` элементов — контракт с темой.
	 *
	 * Здесь, а не в расширении каждого компонента: `data-selected` у Accordion,
	 * ListBox и Select один и тот же, различается только ARIA (`aria-selected`
	 * у опции, `aria-expanded` у секции) — она и остаётся за расширением
	 * компонента. Раньше это делали шаблоны, и при портировании на остальные
	 * пять адаптеров копий стало бы пятнадцать.
	 *
	 * Здесь, а не в item-расширении, потому что item-расширения создаются
	 * лениво — только когда адаптер запросит контекст элемента. Атрибут же
	 * обязан стоять с первой отрисовки, включая серверную.
	 *
	 * Атрибут проставляется **всем** элементам, а не только выбранным: тема
	 * смотрит `[data-selected='true']`, и «не выбран» надо отличать от
	 * «состояние неприменимо».
	 *
	 * Движок коллекции визуального слоя не касается, поэтому проверка, а не
	 * приведение типа: элементом коллекции может быть и не компонент.
	 */
	private _syncDataset(): void {
		this._ctx?.driver.valueOf().forEach((item: TItem) => this._writeDataset(item))
	}

	/** `data-selected` одного элемента — по текущему выбору. */
	private _writeDataset(item: TItem): void {
		;(item as { dataset?: TDataset }).dataset?.add('selected', this.isSelected(item))
	}

	/**
	 * Выбрать элемент. Перед выбором приходит `item:select:before`, и
	 * `preventDefault()` оставляет выбор прежним. Отменяется только «стать
	 * выбранным» — снятие выбора (`deselect`, `resetSelection`) идёт без хука.
	 *
	 * @returns выбран ли элемент после вызова
	 */
	select(item: TItem): boolean {
		if (this._mode === 'none') return false
		// Выбрать выбранное — не смена, как снять невыбранное в `deselect`
		if (this._selected.has(item)) return true
		if (!this._ctx.driver.valueOf().includes(item)) return false

		const event = new TSelectEvent(item)

		this.events.emit('item:select:before', event)

		if (event.defaultPrevented) return false

		if (!this.multiple) {
			// снять выделение с предыдущего
			this._selected.clear()
		}

		this._selected.add(item)

		this._notifySelected()

		return true
	}

	deselect(item: TItem): void {
		if (this._mode === 'none') return

		if (!this._selected.has(item)) return

		this._selected.delete(item)

		this._notifySelected()
	}

	/**
	 * Выбрать элементы пачкой — отдельная операция, а не `select` в цикле:
	 * у `select` каждый вызов сверяется с составом и шлёт своё
	 * `change:selection`, и его подписчики (`data-selected` всех элементов,
	 * пробросы в фасады) проходили бы коллекцию на каждый элемент пачки.
	 * Здесь состав сверяется один раз, а `change:selection` — одно, в конце.
	 *
	 * Хук `item:select:before` — на каждый элемент, как у `select`: отмена
	 * одного остальных не отменяет, принятый встаёт в выбор сразу. Элемент вне
	 * коллекции и уже выбранный пропускаются без хука.
	 *
	 * В `single` и `none` пачка не выбирается: какой из её элементов оставить,
	 * решал бы не пользователь, — тем же правилом `multiple → single` снимает
	 * выбор целиком.
	 */
	selectMany(items: readonly TItem[]): void {
		if (!this.multiple) return

		const stored = new Set(this._ctx.driver.valueOf())
		let changed = false

		for (const item of items) {
			if (this._selected.has(item) || !stored.has(item)) continue

			const event = new TSelectEvent(item)

			this.events.emit('item:select:before', event)

			if (event.defaultPrevented) continue

			this._selected.add(item)
			changed = true
		}

		if (changed) this._notifySelected()
	}

	/**
	 * Снять выделение с элементов пачкой — в любом режиме, как `deselect`.
	 * Снятие хука не имеет, поэтому и сверять нечего: снимается то, что
	 * выбрано, а `change:selection` — одно, в конце.
	 */
	deselectMany(items: readonly TItem[]): void {
		let changed = false

		for (const item of items) {
			if (this._selected.delete(item)) changed = true
		}

		if (changed) this._notifySelected()
	}

	/**
	 * Заменить выбор: выбранными остаются эти элементы, в этом порядке.
	 *
	 * Одна операция, а не сброс и добор: `resetSelection` и `select` по одному
	 * слали `change:selection` на каждый шаг — и тогда, когда выбор в итоге не
	 * менялся. «То же самое» решает сама операция, как сеттер: тот же состав
	 * тем же порядком — не смена, и события нет.
	 *
	 * Хук `item:select:before` — только тому, кто становится выбранным: уже
	 * выбранный остаётся без хука, как у `select`, снимаемый уходит без хука,
	 * как у `deselect`. Элемент вне коллекции пропускается.
	 *
	 * - `multiple` — выбраны принятые из списка, в его порядке; отмена одного
	 *   остальных не отменяет;
	 * - `single` — как `select` по списку: принятый заменяет прежний, итог —
	 *   последний принятый. Пустой список снимает выбор, а список, где не
	 *   принят никто, оставляет прежний — как отменённый `select`;
	 * - `none` — выбора нет.
	 */
	replaceSelection(items: readonly TItem[]): void {
		if (this._mode === 'none') return

		const before = this.selected
		const stored = new Set(this._ctx.driver.valueOf())

		const accepts = (item: TItem): boolean => {
			if (!stored.has(item)) return false
			if (this._selected.has(item)) return true

			const event = new TSelectEvent(item)

			this.events.emit('item:select:before', event)

			return !event.defaultPrevented
		}

		let next: TItem[]

		if (this.multiple) {
			next = [...new Set(items)].filter(accepts)
		} else {
			next = items.length === 0 ? [] : before

			for (const item of items) {
				if (accepts(item)) next = [item]
			}
		}

		if (sameValue(before, next)) return

		this._selected = new Set(next)
		this._notifySelected()
	}

	/** @returns выбран ли элемент после вызова */
	toggle(item: TItem): boolean {
		if (this._mode === 'none') return false

		if (this._selected.has(item)) {
			this.deselect(item)

			return false
		}

		return this.select(item)
	}

	get selected(): TItem[] {
		return Array.from(this._selected)
	}

	isSelected(item: TItem): boolean {
		return this._selected.has(item)
	}

	get selectedCount(): number {
		return this._selected.size
	}

	/**
	 * Полная очистка выделения.
	 */
	resetSelection(): void {
		if (this._selected.size > 0) {
			this._selected.clear()

			this._notifySelected()
		}
	}

	/**
	 * Уведомление об изменении выделения.
	 */
	private _notifySelected(): void {
		this.events.emit('change:selection', this.selected)
	}
}
