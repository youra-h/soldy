import { TChangeEvent } from '../../../common'
import { TStylable } from '../../base/stylable'
import type { TDefaultValues } from '../../base/component'
import type { ILabel, ILabelProps, TLabelEvents, TLabelPosition } from './types'

/**
 * Подпись контрола: текст рядом с CheckBox, Switch или радио.
 *
 * Корень — `label` (`tag`), контрол вложен в него. Связки через `for` и `id`
 * нет: контрол — первый labelable-потомок `label`, поэтому клик по тексту
 * переключает его, а текст подписи становится его доступным именем.
 *
 * Внутри подписи — только строчная разметка, и всё её содержимое войдёт в имя
 * контрола: описание или ошибку рядом с полем в неё не кладут. Вложенный
 * `label` HTML запрещает, а корень `RadioGroup.Item` — как раз `label`.
 * Поэтому радио внутри подписи рисуется с `tag="span"`, а забытый тег ловит
 * `TLabelNestedWarnPlugin`.
 *
 * Своего `disabled` у подписи нет: состояние у контрола, и второй путь к нему
 * разошёлся бы с первым. Выключенную подпись тема красит по вложенному полю.
 *
 * `position` — union ядра: смысл стороны один в любой теме. Порядок в DOM
 * один на все стороны — контрол, потом текст, — сторону рисует тема по
 * модификатору `--position-<v>`. Модификатор стоит всегда, как `--size-*`.
 */
export default class TLabel extends TStylable<ILabelProps, TLabelEvents> implements ILabel {
	static override baseClass = 's-label'

	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<ILabelProps, 'text' | 'position'> = {
		...TStylable.defaultValues,
		tag: 'label',
		text: '',
		position: 'end',
	}

	protected _text: string
	protected _position!: TLabelPosition

	constructor(props: Partial<ILabelProps> = {}) {
		super(props)

		const ctor = new.target as typeof TLabel

		this._text = props.text ?? ctor.defaultValues.text

		this._applyPosition(props.position ?? ctor.defaultValues.position)
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (value === this._text) return

		const e = new TChangeEvent(value, this._text)

		this.events.emit('change:text:before', e)

		if (e.defaultPrevented || e.value === this._text) return

		this._text = e.value
		this.events.emit('change:text', { newValue: e.value, oldValue: e.oldValue })
	}

	get position(): TLabelPosition {
		return this._position
	}

	set position(value: TLabelPosition) {
		if (this._position === value) return

		this._applyPosition(value, this._position)
		this.events.emit('change:position', value)
	}

	protected _applyPosition(newValue: TLabelPosition, oldValue?: TLabelPosition): void {
		this._classes.swap({
			prefix: '--position-',
			oldValue,
			newValue,
		})

		this._position = newValue
	}

	override getProps(): ILabelProps {
		return {
			...super.getProps(),
			text: this.text,
			position: this._position,
		}
	}
}
