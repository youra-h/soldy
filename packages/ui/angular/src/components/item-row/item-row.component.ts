import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy-ui/core'
import { TItemRowSurface } from '../../generated/item-row.metadata'
import { setupItemRow } from './setup.component'

/**
 * Строка элемента коллекции — деталь разметки ListBox.Item, опции Select,
 * пунктов меню и тега (`<div so-item-row>`). Входы, выходы и шаблон — Button
 * (`button.component.html`), сборка своя — по `ItemRowDescriptor`: её
 * экземпляр (`TItemRow`) роль и остановку Tab себе не пишет, их несёт набор
 * `aria` элемента, который разметка кладёт на строку.
 *
 * Экземпляр создаёт это монтирование и отпускает его снятие: строка живёт,
 * пока нарисована, и окно `Virtual` держит их столько, сколько показывает.
 */
@Component({
	selector: '[so-item-row]',
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: '../button/button.component.html',
})
export class TItemRowComponent extends TItemRowSurface<IButton> {
	constructor() {
		super(setupItemRow, { strategy: 'host' })
	}
}
