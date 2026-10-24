import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuItem } from '@soldy-ui/core'
import { AttributesDirective } from '../../../adapter'
import { TItemRowComponent } from '../../item-row'
import { TMenuItemSurface } from '../../../generated/menu-item.metadata'
import { setupMenuItem } from './setup.component'

/**
 * Пункт-действие меню: корень — элемент потребителя, строка — Button на `div`.
 * См. AGENTS.md (Angular), «Menu — триггер шаблоном слота, пункты — коллекция в панели».
 */
@Component({
	selector: 'div[so-menu-item], [so-menu-item]',
	imports: [NgTemplateOutlet, AttributesDirective, TItemRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-item.component.html',
})
export class TMenuItemComponent extends TMenuItemSurface<IMenuItem> {
	constructor() {
		super(setupMenuItem, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}
}
