import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IRadioGroup } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TRadioGroupItemComponent } from './item'
import { TRadioGroupSurface } from '../../generated/radio-group.metadata'
import { setupRadioGroup } from './setup.component'

/**
 * TRadioGroupComponent — группа радио.
 *
 * Обёртки нет: корень — сам элемент потребителя, `<div so-radio-group>`.
 * Классы и наборы ядра раскладывает на него `TComponentBase` (стратегия
 * `'host'`): набор `aria` группы — здесь, `role="radiogroup"` пишет ядро, имя
 * из `aria_label` / `aria_labelledBy` — TAriaPlugin.
 *
 * Контекстов два — свой и фасада коллекции (`setupRadioGroup`), и входы фасада
 * (`items`, `engine`, `trackBy`) — входы того же элемента. Свой слой лифта
 * группа отдаёт поддереву провайдером (`provideElevator()`): радио разметки и
 * радио из данных прочтут из слоя движок этой группы.
 *
 * Радио — содержимое (`<label so-radio-group-item>`), а без него — показанные
 * элементы коллекции (`shown`), запасным содержимым. Слот подписи (`item`)
 * статический и получает радио через scope, рядом — отметку радио
 * (`active`). Радио одной группы стоят где угодно внутри контейнера, и
 * раскладку задаёт потребитель.
 *
 * `div[so-radio-group]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-radio-group], [so-radio-group]
 */
@Component({
	selector: 'div[so-radio-group], [so-radio-group]',
	imports: [NgTemplateOutlet, SlotDirective, TRadioGroupItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './radio-group.component.html',
})
export class TRadioGroupComponent extends TRadioGroupSurface<IRadioGroup> {
	constructor() {
		super((ctrl, inputs) => setupRadioGroup(ctrl, inputs, this.engine), { strategy: 'host' })
	}
}
