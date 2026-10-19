import { TComponentView } from '../component-view'
import type { TDefaultValues } from '../component'
import { TAria } from '../../../common'
import type { IItemGroup, IItemGroupProps, TItemGroupEvents } from './types'

/**
 * Группа элементов коллекции под общей подписью — общая база групп меню
 * (`TMenuGroup`), списка (`TListBoxGroup`) и списка панели Select
 * (`TSelectGroup`): «Вид», «Сортировка», «Фрукты».
 *
 * `role="group"` (APG Menu и Listbox): скринридер объявляет элементы группой,
 * а имя группе — её подпись. Подпись — разметка внутри группы без своего
 * экземпляра, поэтому её набор держит группа (`labelAria`, AGENTS.md, «Часть
 * или слот»). `id` подписи и ссылку на неё (`aria-labelledby`) пишет плагин
 * связок `TItemGroupIdsPlugin`: `id` нужны документу, а не группе. Плагин
 * один на все три формы — формула связки у них одна.
 *
 * В коллекцию группа не входит: её элементы — элементы владельца, и навигация
 * ходит по ним сквозь группы, как по одному списку. Группы из данных
 * (расширение коллекции `group`) владелец рисует этой частью по секциям
 * показанного.
 *
 * Чем подпись служит, кроме имени, знает форма: в `listbox` ARIA пускает
 * только опции и группы, и подпись группы списка — `presentation`; у подписи
 * группы меню роли нет. Блок CSS тоже называет форма, поэтому своего
 * `baseClass` у базы нет.
 */
export default class TItemGroup
	extends TComponentView<IItemGroupProps, TItemGroupEvents>
	implements IItemGroup
{
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IItemGroupProps, 'label'> = {
		...TComponentView.defaultValues,
		label: '',
	}

	protected _label: string
	protected _labelAria: TAria

	constructor(props: Partial<IItemGroupProps> = {}) {
		super(props)

		const ctor = new.target as typeof TItemGroup

		this._label = props.label ?? ctor.defaultValues.label

		this._aria.add('role', 'group')

		this._labelAria = new TAria()

		this._labelAria.events.on('change', () =>
			this.events.emit('change:labelAria', this._labelAria.toObject()),
		)
	}

	get label(): string {
		return this._label
	}

	set label(value: string) {
		if (this._label === value) return

		this._label = value
		this.events.emit('change:label', value)
	}

	/**
	 * Набор подписи — разметки внутри группы. Живой, как `aria`: `id` в него
	 * пишет плагин связок, об изменении набор сообщает `change:labelAria`.
	 */
	get labelAria(): TAria {
		return this._labelAria
	}

	override getProps(): IItemGroupProps {
		return {
			...super.getProps(),
			label: this._label,
		}
	}
}
