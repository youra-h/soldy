import { TValueControl } from '../../../base/value-control'
import type { TDefaultValues } from '../../../base/component'
import type { TPaginationValue } from '../types'
import type { IPaginationItem, IPaginationItemProps, TPaginationItemEvents } from './types'

/**
 * Страница пагинации — элемент коллекции, без коллекционной части.
 *
 * `TValueControl`, где `value` — ключ страницы: по нему расширение коллекции
 * находит страницу значения пагинации и узнаёт её, когда окно сдвинулось, —
 * страница, оставшаяся на экране, — тот же экземпляр. Текст — номер в цифрах
 * локали или текст страницы из `pages`. Оба пишет расширение коллекции, как
 * дату и номер дню календаря: страницу в разметку не ставят, её рисует
 * пагинация по одной на место окна.
 *
 * Всё, что страница знает благодаря пагинации, — текущая ли она
 * (`data-selected`, `aria-current="page"`), размер, вариант и «выключена», —
 * пишут расширения коллекции в её наборы и свойства.
 *
 * Корень — `li`, место в списке страниц. Кнопкой является вложенный `Button`,
 * и `aria` стоит на нём, как у таба.
 */
export default class TPaginationItem
	extends TValueControl<TPaginationValue, IPaginationItemProps, TPaginationItemEvents>
	implements IPaginationItem
{
	static override baseClass = 'so-pagination-item'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<IPaginationItemProps, 'text'> = {
		...TValueControl.defaultValues,
		value: '',
		text: '',
		tag: 'li',
	}

	protected _text: string

	constructor(props: Partial<IPaginationItemProps> = {}) {
		super(props)

		const ctor = new.target as typeof TPaginationItem

		this._text = props.text ?? ctor.defaultValues.text
	}

	/**
	 * `aria` страницы стоит на вложенном `<button>`: корень — место в списке,
	 * которое держит `data-*` для темы, а кнопкой является строка внутри.
	 *
	 * Поэтому ARIA-половину правила «нативный атрибут вместо ARIA-дубля»
	 * решает тег этой кнопки, а не `tag` корня: нативный `disabled` она
	 * получает от своего `TButton`, и `aria-disabled` рядом был бы дублем.
	 */
	protected override get _ariaTag(): string {
		return 'button'
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (this._text === value) return

		this._text = value
		this.events.emit('change:text', value)
	}

	override getProps(): IPaginationItemProps {
		return {
			...super.getProps(),
			text: this._text,
		}
	}
}
