import { Directive } from '@angular/core'
import type { IComponent } from '@soldy-ui/core'
import { TComponentSurface } from '../../generated/component.metadata'
import { setupComponent } from './setup.component'

/** Headless TComponent: корня нет, поэтому директива на `<ng-container so-component>`. */
@Directive({
	selector: '[so-component]',
})
export class TComponentComponent extends TComponentSurface<IComponent> {
	constructor() {
		super(setupComponent)
	}
}
