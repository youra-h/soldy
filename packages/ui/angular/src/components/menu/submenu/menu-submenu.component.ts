import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuSubmenu } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
} from '../../../adapter'
import { TItemRowComponent } from '../../item-row'
import { TFrameComponent } from '../../frame'
import { TIconComponent } from '../../icon'
import { TMenuItemComponent } from '../item'
import { TMenuGroupComponent } from '../group'
import { TMenuSeparatorComponent } from '../separator'
import { TMenuSubmenuSurface } from '../../../generated/menu-submenu.metadata'
import { setupMenuSubmenu } from './setup.component'

/**
 * Пункт с подменю: строка пункта в меню над ним и своя панель с пунктами.
 * Подменю из данных следующего уровня — сам компонент: себя он видит без `imports`.
 * См. AGENTS.md (Angular), «Menu — триггер шаблоном слота, пункты — коллекция в панели».
 */
@Component({
	selector: 'div[so-menu-submenu], [so-menu-submenu]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TItemRowComponent,
		TFrameComponent,
		TIconComponent,
		TMenuItemComponent,
		TMenuGroupComponent,
		TMenuSeparatorComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-submenu.component.html',
})
export class TMenuSubmenuComponent extends TMenuSubmenuSurface<IMenuSubmenu> {
	constructor() {
		super((ctrl, inputs) => setupMenuSubmenu(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
