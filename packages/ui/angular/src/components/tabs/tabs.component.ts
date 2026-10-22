import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITabs } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator } from '../../adapter'
import { TTabsItemComponent } from './item'
import { TTabsSurface } from '../../generated/tabs.metadata'
import { setupTabs } from './setup.component'

/**
 * Набор вкладок: список табов и панели под ним. Набор `aria` и атрибуты потребителя — списку.
 * Панели — слот `content`: `default` лежит внутри `[role=tablist]`.
 */
@Component({
	selector: 'div[so-tabs], [so-tabs]',
	imports: [NgTemplateOutlet, AttributesDirective, SlotDirective, TTabsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs.component.html',
})
export class TTabsComponent extends TTabsSurface<ITabs> {
	constructor() {
		super((ctrl, inputs) => setupTabs(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
