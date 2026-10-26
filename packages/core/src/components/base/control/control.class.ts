import { LABELABLE_TAGS, NATIVE_DISABLED_TAGS, TChangeEvent } from '../../../common'
import type { TEventSink } from '../../../common'
import type { TDefaultValues } from '../component'
import { TStylable } from '../stylable'
import type { IControlProps, TControlEvents } from './types'

/** Есть ли у тега собственный атрибут `disabled` (см. `NATIVE_DISABLED_TAGS`). */
function hasNativeDisabled(tag: string | object): boolean {
	return typeof tag === 'string' && NATIVE_DISABLED_TAGS.has(tag.toLowerCase())
}

/**
 * База для Ui-контролов: stylable (size/variant) + интерактивность (disabled/focused/click).
 *
 * Зачем отдельный слой:
 * - не все интерактивные элементы обязаны иметь size/variant
 * - но все form-controls (input элементы) и кнопки обычно обязаны
 */
export default class TControl<
	TProps extends IControlProps = IControlProps,
	TEvents extends TControlEvents = TControlEvents,
> extends TStylable<TProps, TEvents> {
	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<IControlProps, 'disabled' | 'focused'> = {
		...TStylable.defaultValues,
		disabled: false,
		focused: false,
	}

	protected _disabled: boolean
	protected _focused: boolean

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TControl

		this._disabled = props.disabled ?? ctor.defaultValues.disabled
		this._focused = props.focused ?? ctor.defaultValues.focused

		// The initial state; later the `disabled` and `tag` setters write it
		this._syncDisabled()
		this._dataset.add('disabled', this.disabled)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TControlEvents> {
		return this.events
	}

	get disabled(): boolean {
		return this._disabled
	}
	set disabled(value: boolean) {
		if (value === this._disabled) return

		const e = new TChangeEvent(value, this._disabled)

		this._sink.emit('change:disabled:before', e)

		if (e.defaultPrevented || e.value === this._disabled) return

		this._disabled = e.value
		this._syncDisabled()
		// `data-disabled` is the same state for the theme. Written here and not
		// in `_syncDisabled`: that one is recomputed on a tag change too,
		// because each of its entries depends on the tag of its element — only
		// some tags have a native `disabled`, `aria-disabled` goes only on the
		// rest. The theme needs one value on any tag, or its selector would move
		// along with the attribute. The boolean goes as is: `TDataset` adds the
		// prefix and the string, `false` stays `"false"`.
		this._dataset.add('disabled', e.value)
		this._sink.emit('change:disabled', e.value)
	}

	/**
	 * Тег корня. Пока `aria` стоит на корне (`_ariaTag` — `tag`), тег решает и
	 * labelable: `change:labelable` уходит за `change:tag`, если он сменился.
	 */
	override get tag(): string | object {
		return super.tag
	}
	override set tag(value: string | object) {
		const before = this.labelable

		super.tag = value
		this._labelableChanged(before)
	}

	/** The native `disabled` and `aria-disabled` depend on the tag: recomputed before `change:tag`. */
	protected override _syncTag(): void {
		this._syncDisabled()
	}

	get focused(): boolean {
		return this._focused
	}
	set focused(value: boolean) {
		if (value === this._focused) return

		const e = new TChangeEvent(value, this._focused)

		this._sink.emit('change:focused:before', e)

		if (e.defaultPrevented || e.value === this._focused) return

		this._focused = e.value
		this._sink.emit('change:focused', e.value)
	}

	/**
	 * The tag of the element the markup binds `aria` to.
	 *
	 * By default it is the root — `tag`: on a Button `aria` and `attrs` sit on
	 * the same element. A subclass that renders `aria` onto a nested control of
	 * a fixed tag returns the tag of that control (`TInput`, `TCheckBox`,
	 * `TSwitch` — `input`). Then the ARIA half of the rules is decided by the
	 * element where a screen reader reads it, not by the root.
	 *
	 * The `disabled` and `tag` setters recompute what depends on it
	 * (`_syncDisabled`): a hook that depends on anything else recomputes on that
	 * dependency itself.
	 */
	protected get _ariaTag(): string | object {
		return this.tag
	}

	/**
	 * Labelable ли элемент с `aria` (`LABELABLE_TAGS`): такой подпись называет
	 * своим `for` и передаёт ему клик — поле Input, Select, CheckBox, Switch,
	 * Rating. Группу частей (DateInput, DatePicker) и группу радио подпись
	 * называет только ссылкой `aria-labelledby`, и клик по ней ничего не делает.
	 *
	 * Решает тег элемента с `aria` (`_ariaTag`), а не корня: у Input корень —
	 * обёртка, а labelable — вложенный `<input>`. Сменился — `change:labelable`:
	 * его шлёт запись, от которой он зависит (`_labelableChanged`).
	 */
	get labelable(): boolean {
		const tag = this._ariaTag

		return typeof tag === 'string' && LABELABLE_TAGS.has(tag.toLowerCase())
	}

	/**
	 * Labelable мог смениться — `change:labelable`, если сменился. Зовёт запись,
	 * от которой он зависит: здесь тег корня, у ползунка — значение (число
	 * ручек). Наследник, чей labelable зависит от чего-то ещё, зовёт это и при
	 * смене той зависимости.
	 */
	protected _labelableChanged(before: boolean): void {
		const labelable = this.labelable

		if (labelable === before) return

		this._sink.emit('change:labelable', labelable)
	}

	/**
	 * On tags with their own `disabled` (`NATIVE_DISABLED_TAGS`) the state goes
	 * through the native attribute — it both blocks focus and excludes the
	 * element from form submission, which `aria-disabled` cannot do. On the
	 * other tags `aria-disabled` is the only way to tell a screen reader, and
	 * duplicating it with the native attribute would be wrong: such a tag has
	 * no such attribute.
	 *
	 * The sets are bound to their own elements, so each half is decided by the
	 * tag of its element: `disabled` in `attrs` — by the root tag (`tag`),
	 * `aria-disabled` in `aria` — by the tag of the element with `aria`
	 * (`_ariaTag`). "Never both" means "never both on one element". On a Button
	 * it is one and the same element. On Input, CheckBox and Switch `aria` sits
	 * on the nested `<input>`: its native `disabled` comes from the markup, so
	 * the core writes no ARIA duplicate for it, and the root `div` has no native
	 * `disabled` at all.
	 *
	 * It depends on both `disabled` and `tag`, so both setters call it — after
	 * the write and before their event (`_syncTag` for the tag); the
	 * constructor calls it for the initial state. It used to be a getter, and
	 * the recomputation came by itself; the price of a shared set is that such
	 * rules have to be wired explicitly.
	 */
	protected _syncDisabled(): void {
		// Непустая строка: '' React не поставит атрибут вовсе, а 'false' в DOM
		// всё равно блокирует элемент — value здесь не имеет значения, только
		// присутствие атрибута.
		this._attrs.add(
			'disabled',
			this.disabled && hasNativeDisabled(this.tag) ? 'disabled' : null,
		)
		this._aria.add(
			'aria-disabled',
			this.disabled && !hasNativeDisabled(this._ariaTag) ? 'true' : null,
		)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			disabled: this.disabled,
			focused: this.focused,
		} as TProps
	}
}
