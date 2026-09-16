import { TStateUnit, NATIVE_DISABLED_TAGS } from '../../../common'
import type { TValuePayload, TEventSink } from '../../../common'
import type { IComponentOptions, TDefaultValues } from '../component'
import { TStylable } from '../stylable'
import type { IControlProps, TControlEvents, TControlStates } from './types'

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
	TStates extends TControlStates = TControlStates,
> extends TStylable<TProps, TEvents, TStates> {
	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<IControlProps, 'disabled' | 'focused'> = {
		...TStylable.defaultValues,
		disabled: false,
		focused: false,
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TControl

		const disabled = props.disabled ?? ctor.defaultValues.disabled
		const focused = props.focused ?? ctor.defaultValues.focused

		this._states.disabled =
			options.states?.disabled ?? new TStateUnit<boolean>({ initial: disabled })

		this._states.disabled.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:disabled', payload.newValue)
		})

		this._states.focused =
			options.states?.focused ?? new TStateUnit<boolean>({ initial: focused })

		this._states.focused.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:focused', payload.newValue)
		})

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

	/**
	 * Итог: у элемента коллекции — своё **или** владельца (см.
	 * `bindDisabledToOwner`), у остальных — своё.
	 */
	get disabled(): boolean {
		return this._states.disabled.value
	}
	/**
	 * Пишет своё значение. Сравнивает со своим (`rawValue`), а не с итогом:
	 * в выключенном списке итог уже `true`, и своё `true` иначе проглотилось
	 * бы — и пропало при включении списка.
	 */
	set disabled(value: boolean) {
		if (this._states.disabled.rawValue !== value) {
			this._states.disabled.value = value
		}
	}

	get focused(): boolean {
		return this._states.focused.value
	}
	set focused(value: boolean) {
		if (this._states.focused.value !== value) {
			this._states.focused.value = value
		}
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
