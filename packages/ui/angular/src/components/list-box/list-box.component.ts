import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IListBox } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator } from '../../adapter'
import { TListBoxItemComponent } from './item'
import { TListBoxGroupComponent } from './group'
import { TListBoxSurface } from '../../generated/list-box.metadata'
import { setupListBox } from './setup.component'

/**
 * Список с выбором: корень — рамка, а набор `aria` и написанное на корне получает узел списка.
 * AGENTS.md (Angular), «Коллекция: два контекста — одна связка».
 */
@Component({
	selector: 'div[so-list-box], [so-list-box]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		SlotDirective,
		TListBoxItemComponent,
		TListBoxGroupComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box.component.html',
})
export class TListBoxComponent extends TListBoxSurface<IListBox> {
	constructor() {
		super((ctrl, inputs) => setupListBox(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
