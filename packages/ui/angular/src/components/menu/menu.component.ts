import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenu } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator } from '../../adapter'
import { TFrameComponent } from '../frame'
import { TMenuItemComponent } from './item'
import { TMenuSubmenuComponent } from './submenu'
import { TMenuGroupComponent } from './group'
import { TMenuSeparatorComponent } from './separator'
import { TMenuSurface } from '../../generated/menu.metadata'
import { setupMenu } from './setup.component'

/**
 * Меню действий у кнопки (APG Menu Button) или контекстное (`openOn="contextmenu"`).
 * См. AGENTS.md (Angular), «Menu — триггер шаблоном слота, пункты — коллекция в панели».
 */
@Component({
	selector: 'span[so-menu], [so-menu]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		SlotDirective,
		TFrameComponent,
		TMenuItemComponent,
		TMenuSubmenuComponent,
		TMenuGroupComponent,
		TMenuSeparatorComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu.component.html',
})
export class TMenuComponent extends TMenuSurface<IMenu> {
	constructor() {
		super((ctrl, inputs) => setupMenu(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
		})
	}
}
