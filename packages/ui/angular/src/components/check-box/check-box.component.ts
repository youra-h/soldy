import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ICheckBox } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../adapter'
import { CheckBoxInputNames, TCheckBoxSurface } from './base.component'
import { setupCheckBox } from './setup.component'

/**
 * TCheckBoxComponent — флажок: корень и нативный `<input type="checkbox">`
 * внутри, рядом — коробка с отметкой.
 *
 * Селектор — элементный, `<so-check-box>`: у поля атрибуты потребителя
 * делятся между корнем и вложенным `<input>`, и корнем служит сам элемент
 * компонента. Это строчный элемент, поэтому флажок кладут в подпись `Label`:
 * внутри `label` HTML разрешает только строчную разметку, и всё внутри — тоже
 * `span`. Классы, `attrs` (`dir`) и скрытие раскладывает на корень
 * `TComponentBase` (стратегия `'host'`); `aria` стоит на `<input>` — его
 * кладёт директива набора (`AttributesDirective`). Статические атрибуты,
 * которые потребитель записал на флажок, кроме `class` и `style`, база
 * переносит на `<input>` (`control`).
 *
 * Отметку и «выбрано частично» скринридеру сообщают нативные `checked` и
 * `indeterminate` поля, `aria-checked` ядро не пишет. Оба — привязки свойств
 * `<input>`: Angular пишет их на смену значения ядра. Переключает значение
 * плагин флажка по `change` поля. Нативные `disabled` и `required` проводит
 * разметка, ARIA-дублей рядом с ними ядро не пишет.
 *
 * Коробка — декор: `aria-hidden` не пускает иконки слотов в доступное имя,
 * которое флажку даёт подпись. Отметка — слот `icon` у выбранного и
 * `indeterminate-icon` у частично выбранного
 * (`<ng-template slot="icon" let-value="value" let-indeterminate="indeterminate">`),
 * без слота — `<svg>` иконки из пакета по ролям `check` и `checkIndeterminate`
 * (`RoleIconDirective`), а не компонент Icon: она появляется и пропадает с
 * каждой сменой отметки, и Icon собирал бы на каждую свой контекст и плагины —
 * в таблице «выбрать все» собирала их тысячами. Размер и цвет отметке даёт
 * тема флажка по `s-check-box__mark`.
 *
 * Selector: so-check-box
 */
@Component({
	selector: 'so-check-box',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, RoleIconDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './check-box.component.html',
})
export class TCheckBoxComponent extends TCheckBoxSurface<ICheckBox> {
	constructor() {
		super(CheckBoxInputNames, { strategy: 'host', sets: ['attrs'], control: true })
	}

	protected createBinding(ctrl: ICheckBox | undefined, inputs: object): TBinding<ICheckBox> {
		return setupCheckBox(ctrl, inputs)
	}
}
