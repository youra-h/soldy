import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../../base/component'
import type { TRadioGroupView } from '../types'
import type {
	IRadioGroupItem,
	IRadioGroupItemProps,
	TRadioGroupItemEvents,
	TRadioGroupItemStates,
} from './types'

/**
 * Радио — элемент группы, без коллекционной части.
 *
 * `TValueControl`, где `value` — то, что радио отдаёт группе: по нему группа
 * находит, какое радио отметить, когда ей задали значение.
 *
 * Корень — `label` (`tag`): клик по подписи выбирает радио, а подпись
 * становится его доступным именем. Контрол — вложенный нативный
 * `input[type=radio]`. Группировку по общему `name`, стрелки по кругу, пропуск
 * выключенных, пробел, одну остановку Tab на группу и участие в форме даёт
 * браузер, поэтому ни клавиатурного плагина, ни `tabindex` у радио нет.
 *
 * Роли и `aria-checked` элемент не пишет: у `input[type=radio]` они нативные,
 * состояние сообщает `checked`, и ARIA-дубль был бы лишним. Отмеченность —
 * членство в коллекции (`active` фасада), класс о ней не знает.
 *
 * `view` — модификатор корня. Значение раздаёт группа (`TRadioGroupExtension`):
 * тема рисует радио по его собственному корню, у контейнера группы стилей нет.
 */
export default class TRadioGroupItem
	extends TValueControl<
		string | number,
		IRadioGroupItemProps,
		TRadioGroupItemEvents,
		TRadioGroupItemStates
	>
	implements IRadioGroupItem
{
	static override baseClass = 's-radio-group-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IRadioGroupItemProps, never, 'view'> = {
		...TValueControl.defaultValues,
		value: '',
		view: undefined,
		tag: 'label',
	}

	protected _view: TRadioGroupView | undefined

	constructor(
		props: Partial<IRadioGroupItemProps> = {},
		options: IComponentOptions<TRadioGroupItemStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TRadioGroupItem

		this._applyView(props.view ?? ctor.defaultValues.view)
	}

	/**
	 * `aria` радио стоит на вложенном `input[type=radio]`, а не на корне-`label`.
	 * `disabled` у него нативный, поэтому `aria-disabled` рядом был бы дублем:
	 * ARIA-половину правила «нативный атрибут вместо ARIA-дубля» решает тег
	 * этого поля, а не `tag` корня.
	 */
	protected override get _ariaTag(): string {
		return 'input'
	}

	get view(): TRadioGroupView | undefined {
		return this._view
	}

	set view(value: TRadioGroupView | undefined) {
		if (this._view === value) return

		this._applyView(value, this._view)
		this.events.emit('change:view', value)
	}

	/** Модификатор вида — с префиксом `--view-`; `swap` пропускает пустое значение. */
	protected _applyView(newValue: TRadioGroupView | undefined, oldValue?: TRadioGroupView): void {
		this._classes.swap({
			prefix: '--view-',
			oldValue,
			newValue,
		})

		this._view = newValue
	}

	override getProps(): IRadioGroupItemProps {
		return {
			...super.getProps(),
			view: this._view,
		}
	}
}
