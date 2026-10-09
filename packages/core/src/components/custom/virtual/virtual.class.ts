import { TComponent } from '../../base/component'
import type { TDefaultValues } from '../../base/component'
import type { IVirtual, IVirtualProps, TVirtualEvents } from './types'

/**
 * Окно для длинных списков — невизуальная обёртка, как DragAndDrop.
 *
 * Коллекции внутри обёртки (ListBox, Table) рисуют только видимые элементы, а
 * на месте остальных — распорки той же высоты. Сама обёртка знает только,
 * включено ли окно (`enabled`): что рисовать, решает расширение рисования
 * коллекции (`draw`), а ставит ему окно и замер проводка обёртки. Поэтому о
 * движке коллекции обёртка не знает, а код окна попадает в сборку приложения
 * только вместе с ней: списку с пагинацией или с десятком элементов он не
 * нужен.
 */
export default class TVirtual
	extends TComponent<IVirtualProps, TVirtualEvents>
	implements IVirtual
{
	static defaultValues: typeof TComponent.defaultValues &
		TDefaultValues<IVirtualProps, 'enabled'> = {
		...TComponent.defaultValues,
		enabled: true,
	}

	private _enabled: boolean

	constructor(props: Partial<IVirtualProps> = {}) {
		super(props)

		const ctor = new.target as typeof TVirtual

		this._enabled = props.enabled ?? ctor.defaultValues.enabled
	}

	get enabled(): boolean {
		return this._enabled
	}

	set enabled(value: boolean) {
		if (this._enabled === value) return

		this._enabled = value
		this.events.emit('change:enabled', value)
	}
}
