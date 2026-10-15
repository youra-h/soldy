import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISwitch } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../adapter'
import { SwitchInputNames, TSwitchSurface } from './base.component'
import { setupSwitch } from './setup.component'

/**
 * TSwitchComponent — переключатель: корень и нативный
 * `<input type="checkbox">` внутри, рядом — дорожка с ручкой.
 *
 * Селектор — элементный, `<so-switch>`, корень — сам элемент компонента, как
 * у CheckBox: строчный, и переключатель кладут в подпись `Label`. Классы,
 * `attrs` (`dir`) и скрытие раскладывает на корень `TComponentBase`
 * (стратегия `'host'`), статические атрибуты потребителя, кроме `class` и
 * `style`, она переносит на `<input>` (`control`).
 *
 * `role="switch"` ядро пишет в `aria` поля — его кладёт на `<input>`
 * директива набора (`AttributesDirective`). Состояние скринридеру сообщает
 * нативный `checked` — привязка свойства, Angular пишет её на смену значения
 * ядра; переключает значение плагин по `change` поля.
 *
 * Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
 * имя, которое переключателю даёт подпись. В ручке — слот `on` у включённого
 * и `off` у выключенного, scope `{ value, ctrl }`
 * (`<ng-template slot="on" let-value="value" let-ctrl="ctrl">`).
 *
 * Selector: so-switch
 */
@Component({
	selector: 'so-switch',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './switch.component.html',
})
export class TSwitchComponent extends TSwitchSurface<ISwitch> {
	constructor() {
		super(SwitchInputNames, { strategy: 'host', sets: ['attrs'], control: true })
	}

	protected createBinding(ctrl: ISwitch | undefined, inputs: object): TBinding<ISwitch> {
		return setupSwitch(ctrl, inputs)
	}
}
