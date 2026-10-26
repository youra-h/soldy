import { TComponentView } from '../component-view'
import type { TDefaultValues } from '../component'
import { TAria } from '../../../common'
import type { TEventSink } from '../../../common'
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
 * показанного. Группа разметки входит в ту же группировку: проводка части
 * (`setup/content/extensions/item-group`) отдаёт элементам внутри ключ
 * группы — от экземпляра, отдельного пропа нет — и регистрирует её подпись в
 * расширении `group`. Поэтому `sections` описывают и группы разметки.
 *
 * Чем подпись служит, кроме имени, знает форма: в `listbox` ARIA пускает
 * только опции и группы, и подпись группы списка — `presentation`; у подписи
 * группы меню роли нет. Блок CSS тоже называет форма, поэтому своего
 * `baseClass` у базы нет.
 *
 * Пропсы и карта событий — параметры: группа переключателей меню
 * (`TMenuRadioGroup`) — та же группа со своим значением.
 */
export default class TItemGroup<
	TProps extends IItemGroupProps = IItemGroupProps,
	TEvents extends TItemGroupEvents = TItemGroupEvents,
>
	extends TComponentView<TProps, TEvents>
	implements IItemGroup<TProps, TEvents>
{
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IItemGroupProps, 'label'> = {
		...TComponentView.defaultValues,
		label: '',
	}

	protected _label: string
	protected _labelAria: TAria

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TItemGroup

		this._label = props.label ?? ctor.defaultValues.label

		this._aria.add('role', 'group')

		this._labelAria = new TAria(() =>
			this._sink.emit('change:labelAria', this._labelAria.toObject()),
		)
	}

	/**
	 * Эмит собственных событий группы — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TItemGroupEvents> {
		return this.events
	}

	get label(): string {
		return this._label
	}

	set label(value: string) {
		if (this._label === value) return

		this._label = value
		this._sink.emit('change:label', value)
	}

	/**
	 * Набор подписи — разметки внутри группы. Живой, как `aria`: `id` в него
	 * пишет плагин связок, об изменении набор сообщает `change:labelAria`.
	 */
	get labelAria(): TAria {
		return this._labelAria
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			label: this._label,
		}
	}
}
