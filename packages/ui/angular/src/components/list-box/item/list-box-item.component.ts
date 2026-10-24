import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IListBoxItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TItemRowComponent } from '../../item-row'
import { TIconComponent } from '../../icon'
import { TListBoxItemSurface } from '../../../generated/list-box-item.metadata'
import { setupListBoxItem } from './setup.component'

/**
 * Элемент списка: строка — Button на `div` (под этот тег написан `TListBoxItem._ariaTag`),
 * написанное на корне получает она. Клик — `list.choose()` фасада: выключенному откажет список.
 */
@Component({
	selector: 'div[so-list-box-item], [so-list-box-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TItemRowComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box-item.component.html',
})
export class TListBoxItemComponent extends TListBoxItemSurface<IListBoxItem> {
	constructor() {
		super(setupListBoxItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}
}
