import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { TMenuSeparator } from '@soldy-ui/core'
import { TMenuSeparatorSurface } from '../../../generated/menu-separator.metadata'
import { setupMenuSeparator } from './setup.component'

/** Разделитель меню: в коллекцию не входит, внутри ничего не рисует. */
@Component({
	selector: 'div[so-menu-separator], [so-menu-separator]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: '',
})
export class TMenuSeparatorComponent extends TMenuSeparatorSurface<TMenuSeparator> {
	constructor() {
		super(setupMenuSeparator, { strategy: 'host' })
	}
}
