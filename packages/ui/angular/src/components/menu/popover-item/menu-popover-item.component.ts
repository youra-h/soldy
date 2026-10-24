import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuPopoverItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TItemRowComponent } from '../../item-row'
import { TFrameComponent } from '../../frame'
import { TIconComponent } from '../../icon'
import { TMenuPopoverItemSurface } from '../../../generated/menu-popover-item.metadata'
import { setupMenuPopoverItem } from './setup.component'

/**
 * Пункт с панелью: строка пункта в меню и своя панель сбоку с любым содержимым.
 * См. AGENTS.md (Angular), «Menu — триггер шаблоном слота, пункты — коллекция в панели».
 */
@Component({
	selector: 'div[so-menu-popover-item], [so-menu-popover-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TItemRowComponent,
		TFrameComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-popover-item.component.html',
})
export class TMenuPopoverItemComponent extends TMenuPopoverItemSurface<IMenuPopoverItem> {
	constructor() {
		super(setupMenuPopoverItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
