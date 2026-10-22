import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITabsItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TTabsItemSurface } from '../../../generated/tabs-item.metadata'
import { setupTabsItem } from './setup.component'

/**
 * Таб: строка — Button с `role="tab"` и набором `aria`, кнопка закрытия — её сосед:
 * интерактивный потомок у `<button role="tab">` HTML запрещает.
 */
@Component({
	selector: 'div[so-tabs-item], [so-tabs-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs-item.component.html',
})
export class TTabsItemComponent extends TTabsItemSurface<ITabsItem> {
	constructor() {
		super(setupTabsItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}

	/** Клик по строке: таб становится активным, если активация не отменена. */
	protected activate(): void {
		const context = this.facade()?.context

		if (context) context.adapters.activation.active = true
	}

	/** Клик по крестику: закрыть таб; клик не всплывает, как `@click.stop` у Vue. */
	protected close(event: Event): void {
		event.stopPropagation()
		this.facade()?.context?.adapters.tabs.close()
	}
}
