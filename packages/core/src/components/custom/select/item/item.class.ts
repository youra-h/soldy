import { TValueControl } from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import { TStateUnit, TEvented } from '../../../../common'
import type { TValuePayload } from '../../../../common'
import type { ISelectItem, ISelectItemProps, TSelectItemEvents, TSelectItemStates } from './types'

/**
 * Опция списка (`Select.Item`).
 *
 * `value` — ключ опции, `text` — то, что видно. Разделение то же, что у
 * `TTabsItem`: `value` внутри, `text` на экране.
 *
 * `TListItem` намеренно не наследуем, хотя он тоже несёт `text`: вместе с ним
 * пришли бы `wordWrap` и связь с List, а Select к списку отношения не имеет —
 * они лишь похожи внешне. Общее у них не класс, а `Button` внутри строки,
 * плагины подсветки и стили.
 */
export default class TSelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
>
	extends TValueControl<string | number, TProps, TEvents, TSelectItemStates>
	implements ISelectItem<TProps, TEvents>
{
	static override baseClass = 's-select-item'

	static defaultValues: Partial<ISelectItemProps> = {
		...TValueControl.defaultValues,
		text: '',
		value: '',
		tag: 'div',
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TSelectItemStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TSelectItem
		const own = props as Partial<ISelectItemProps>

		this._states.text =
			options.states?.text ??
			new TStateUnit<string>({ initial: own.text ?? ctor.defaultValues.text! })

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			;(this.events as TEvented<TSelectItemEvents>).emit('change:text', payload)
		})

		// Только то, что опция знает о себе сама: она — опция.
		//
		// `id` и `aria-selected` — не отсюда: первый нужен, чтобы на опцию
		// сослалось поле через `aria-activedescendant`, второй выражает выбор.
		// И то и другое знает коллекция, а не элемент; пишет `TSelectExtension`.
		this._aria.add('role', 'option')
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
		} as TProps
	}
}
