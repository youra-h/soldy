import { NATIVE_DISABLED_TAGS, TChangeEvent } from '../../../common'
import type { TEventSink } from '../../../common'
import type { IComponentOptions, TDefaultValues } from '../component'
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

	constructor(props: Partial<TProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TControl

		this._disabled = props.disabled ?? ctor.defaultValues.disabled
		this._focused = props.focused ?? ctor.defaultValues.focused

		this.events.on('change:disabled', () => this._syncDisabled())
		this.events.on('change:tag', () => this._syncDisabled())

		this._syncDisabled()

		// `data-disabled` — то же состояние для темы. Отдельной подпиской, а не
		// в `_syncDisabled`: тот пересчитывается и на `change:tag`, потому что
		// каждая его запись зависит от тега своего элемента — нативный
		// `disabled` есть только у части тегов, `aria-disabled` ставится только
		// на остальных. Теме нужно одно значение на любом теге, иначе её
		// селектор переезжал бы вместе с атрибутом. Булево уходит как есть:
		// префикс и строку делает `TDataset`, `false` остаётся `"false"`.
		this.events.on('change:disabled', () => this._dataset.add('disabled', this.disabled))

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
		this._sink.emit('change:disabled', e.value)
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
	 * Тег элемента, на который разметка биндит `aria`.
	 *
	 * По умолчанию это корень — `tag`: у Button `aria` и `attrs` стоят на одном
	 * элементе. Наследник, который выводит `aria` на вложенный контрол
	 * фиксированного тега, возвращает тег этого контрола (`TInput`,
	 * `TCheckBox`, `TSwitch` — `input`). Тогда ARIA-половина правил решается
	 * по элементу, на котором её прочтёт скринридер, а не по корню.
	 *
	 * Пересчёт идёт на `change:disabled` и `change:tag`: хук, зависящий от
	 * чего-то ещё, потребует своей подписки.
	 */
	protected get _ariaTag(): string | object {
		return this.tag
	}

	/**
	 * У тегов с собственным `disabled` (`NATIVE_DISABLED_TAGS`) состояние
	 * передаётся нативным атрибутом — он и блокирует фокус, и исключает
	 * элемент из отправки формы, чего `aria-disabled` не умеет. У остальных
	 * тегов `aria-disabled` — единственный способ сообщить об этом
	 * скринридеру, а дублировать его нативным атрибутом было бы неверно: тега
	 * с таким атрибутом нет.
	 *
	 * Наборы биндятся к своим элементам, поэтому каждую половину решает тег её
	 * элемента: `disabled` в `attrs` — тег корня (`tag`), `aria-disabled` в
	 * `aria` — тег элемента с `aria` (`_ariaTag`). «Никогда оба» значит
	 * «никогда оба на одном элементе». У Button это один и тот же элемент. У
	 * Input, CheckBox и Switch `aria` стоит на вложенном `<input>`: его
	 * нативный `disabled` проводит разметка, поэтому ARIA-дубль ядро ему не
	 * пишет, а у корня-`div` нативного `disabled` нет вовсе.
	 *
	 * Зависит и от `disabled`, и от `tag`, поэтому пересчитывается на оба
	 * события. Раньше это был геттер и пересчёт получался сам; плата за общий
	 * набор — такие правила приходится проводить явно.
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
