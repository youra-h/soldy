import { TComponentView } from '../../../base/component-view'
import type { TDefaultValues } from '../../../base/component'
import { TAria } from '../../../../common'
import type { IMenuGroup, IMenuGroupProps, TMenuGroupEvents } from './types'

/**
 * Группа пунктов меню под общей подписью (`Menu.Group`): «Вид», «Сортировка».
 *
 * `role="group"` (APG Menu): скринридер объявляет пункты группой, а имя
 * группе — её подпись. Подпись — разметка внутри группы без своего
 * экземпляра, поэтому её набор держит группа (`labelAria`, AGENTS.md, «Часть
 * или слот»). `id` подписи и ссылку на неё (`aria-labelledby`) пишет плагин
 * связок `TMenuGroupIdsPlugin`: `id` нужны документу, а не группе.
 *
 * В коллекцию меню группа не входит: её пункты — пункты меню, и навигация
 * ходит по ним сквозь группы, как по одному списку.
 */
export class TMenuGroup
	extends TComponentView<IMenuGroupProps, TMenuGroupEvents>
	implements IMenuGroup
{
	static override baseClass = 'so-menu-group'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IMenuGroupProps, 'label'> = {
		...TComponentView.defaultValues,
		label: '',
	}

	protected _label: string
	protected _labelAria: TAria

	constructor(props: Partial<IMenuGroupProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuGroup

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

	override getProps(): IMenuGroupProps {
		return {
			...super.getProps(),
			label: this._label,
		}
	}
}
