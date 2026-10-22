import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ITabsContent } from '@soldy-ui/core'
import { TTabsContentSurface } from '../../../generated/tabs-content.metadata'
import { setupTabsContent } from './setup.component'

/**
 * Панель таба: видна, когда активен связанный по `value` таб.
 * AGENTS.md (Angular), «Панель таба скрыта, пока её таб не активен».
 */
@Component({
	selector: 'div[so-tabs-content], [so-tabs-content]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs-content.component.html',
})
export class TTabsContentComponent extends TTabsContentSurface<ITabsContent> {
	constructor() {
		super(setupTabsContent, {
			strategy: 'host',
			sets: ['attrs', 'aria'],
			shownBy: 'active',
		})
	}
}
