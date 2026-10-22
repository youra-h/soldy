import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuRadioItem } from '@soldy-ui/core'
import { AttributesDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TMenuRadioItemSurface } from '../../../generated/menu-radio-item.metadata'
import { setupMenuRadioItem } from './setup.component'

/** Переключатель меню: строка, как у флажка, с точкой; в группе отмечен один. */
@Component({
	selector: 'div[so-menu-radio-item], [so-menu-radio-item]',
	imports: [NgTemplateOutlet, AttributesDirective, TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-radio-item.component.html',
})
export class TMenuRadioItemComponent extends TMenuRadioItemSurface<IMenuRadioItem> {
	constructor() {
		super(setupMenuRadioItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
