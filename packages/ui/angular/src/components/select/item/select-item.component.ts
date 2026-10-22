import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISelectItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TSelectItemSurface } from '../../../generated/select-item.metadata'
import { setupSelectItem } from './setup.component'

/**
 * Опция Select: строка — Button на `span` (под этот тег написан `TSelectItem._ariaTag`),
 * написанное на корне получает она. Клик — `select.choose()` фасада, как клавиатура поля.
 */
@Component({
	selector: 'div[so-select-item], [so-select-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './select-item.component.html',
})
export class TSelectItemComponent extends TSelectItemSurface<ISelectItem> {
	constructor() {
		super(setupSelectItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}
}
