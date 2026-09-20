import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../../base/component'
import { TAria, TStateUnit } from '../../../../common'
import type { TValuePayload, TEventSink } from '../../../../common'
import type { ITagsItem, ITagsItemProps, TTagsItemEvents, TTagsItemStates } from './types'

/**
 * Элемент Tags — тег.
 *
 * `TValueControl`, где `value` — ключ тега: по нему коллекция находит, что
 * выделить, когда набору задали значение.
 *
 * Закрытие — копия `TTabsItem`: явное значение элемента приоритетнее
 * глобального `closable` компонента. Что выключенный тег не закрывается,
 * решает item-адаптер коллекции (`TTagsItemExtension.closable`), а не элемент.
 *
 * Кнопка закрытия, в отличие от таба, — живой набор `closeAria`, а не
 * вычисляемый снимок: её `tabindex` зависит от режима выбора коллекции, о
 * котором тег не знает. Имя пишет тег, `tabindex` — `TTagsExtension`, как
 * у `aria` строки роль пишет тег, а `aria-selected` — коллекция.
 */
export default class TTagsItem<
	TProps extends ITagsItemProps = ITagsItemProps,
	TEvents extends TTagsItemEvents = TTagsItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TTagsItemStates>
	implements ITagsItem<TProps, TEvents>
{
	static override baseClass = 's-tags-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<ITagsItemProps, 'text' | 'closeLabel', 'closable'> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		closable: undefined,
		closeLabel: 'Close',
		tag: 'div',
	}

	protected _closeLabel!: string
	protected _closeAria: TAria

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TTagsItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTagsItem
		const customProps = props as Partial<ITagsItemProps>

		this._closeLabel = customProps.closeLabel ?? ctor.defaultValues.closeLabel

		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: customProps.text ?? ctor.defaultValues.text })

		this._states.closable =
			options.states?.closable ??
			new TStateUnit<boolean | undefined>({
				initial: customProps.closable ?? ctor.defaultValues.closable,
			})

		this._closeAria = new TAria()

		this._closeAria.events.on('change', () =>
			this._sink.emit('change:closeAria', this._closeAria.toObject()),
		)

		this._syncCloseName()

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			this._syncCloseName()
			this._sink.emit('change:text', payload)
		})

		this._states.closable.events.on('change', (payload: TValuePayload<boolean | undefined>) => {
			this._classes.toggle(`--closable`, !!payload.newValue)
			this._sink.emit('change:closable', payload.newValue)
		})

		this._classes.toggle(`--closable`, !!this._states.closable.value)

		// Только то, что тег знает о себе сам: он — элемент набора. Роль
		// меняется на `option`, когда у коллекции включён выбор — об этом
		// знает `TTagsExtension`, не элемент.
		this._aria.add('role', 'listitem')
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTagsItemEvents> {
		return this.events
	}

	/**
	 * `aria` тега стоит на вложенном `Button` — строке тега. Тег у неё
	 * фиксированный (`div`), разметка задаёт его сама, поэтому от `tag` корня
	 * ARIA-половина правила «нативный атрибут вместо ARIA-дубля» не зависит:
	 * у `div` своего `disabled` нет, и состояние остаётся `aria-disabled`,
	 * каким бы ни был корень.
	 */
	protected override get _ariaTag(): string {
		return 'div'
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	/**
	 * Своё значение тега, `undefined` — наследовать от владельца.
	 *
	 * `disabled` его не трогает: правило «выключенный тег не закрывается»
	 * выводит item-адаптер (`TTagsItemExtension.closable`). Раньше оно было
	 * подпиской на `change:disabled`, которая переписывала это значение, — и
	 * у тега, выключенного со старта, не срабатывала вовсе: события нет.
	 */
	get closable(): boolean | undefined {
		return this._states.closable.value
	}

	set closable(value: boolean | undefined) {
		if (this._states.closable.rawValue === value) return

		this._states.closable.value = value
	}

	/**
	 * Слово для кнопки закрытия. Дефолт английский — язык интерфейса ядру
	 * неизвестен, а промолчать нельзя: кнопка останется без имени.
	 */
	get closeLabel(): string {
		return this._closeLabel
	}

	set closeLabel(value: string) {
		if (this._closeLabel === value) return

		this._closeLabel = value
		this._syncCloseName()
		this._sink.emit('change:closeLabel', value)
	}

	/**
	 * Атрибуты кнопки закрытия — отдельный набор, а не часть `aria`: `aria`
	 * описывает сам тег, а это кнопка рядом с ним. Один элемент — один набор.
	 *
	 * Живой, как `aria`, потому что пишут в него двое: имя — тег, `tabindex` —
	 * `TTagsExtension` по режиму выбора. За границу core → ui уходит снимок
	 * (`valueOf()`), об изменении набор сообщает `change:closeAria`.
	 */
	get closeAria(): TAria {
		return this._closeAria
	}

	/**
	 * Имя кнопки закрытия — вместе с текстом тега: «Close Настройки». Без
	 * текста все кнопки набора назывались бы одинаково.
	 */
	private _syncCloseName(): void {
		const text = this.text.trim()

		this._closeAria.add('aria-label', text ? `${this._closeLabel} ${text}` : this._closeLabel)
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
			closable: this.closable,
			closeLabel: this._closeLabel,
		} as TProps
	}
}
