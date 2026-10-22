import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IItemGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TMenuGroupSurface } from '../../../generated/menu-group.metadata'
import { setupMenuGroup } from './setup.component'

/**
 * Пункты меню под общей подписью: в коллекцию меню они входят сквозь группу.
 * См. AGENTS.md (Angular), «Menu — триггер шаблоном слота, пункты — коллекция в панели».
 */
@Component({
	selector: 'div[so-menu-group], [so-menu-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-group.component.html',
})
export class TMenuGroupComponent extends TMenuGroupSurface<IItemGroup> {
	constructor() {
		super(setupMenuGroup, { strategy: 'host' })
	}
}
