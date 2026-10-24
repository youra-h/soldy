import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuCheckboxItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TItemRowComponent } from '../../item-row'
import { TIconComponent } from '../../icon'
import { TMenuCheckboxItemSurface } from '../../../generated/menu-checkbox-item.metadata'
import { setupMenuCheckboxItem } from './setup.component'

/** Флажок меню: строка, как у пункта-действия, с отметкой — выбором коллекции меню. */
@Component({
	selector: 'div[so-menu-checkbox-item], [so-menu-checkbox-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TItemRowComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-checkbox-item.component.html',
})
export class TMenuCheckboxItemComponent extends TMenuCheckboxItemSurface<IMenuCheckboxItem> {
	constructor() {
		super(setupMenuCheckboxItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
