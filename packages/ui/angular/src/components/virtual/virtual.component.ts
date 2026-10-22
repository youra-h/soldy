import { Directive } from '@angular/core'
import type { IVirtual } from '@soldy-ui/core'
import { provideElevator } from '../../adapter'
import { TVirtualSurface } from '../../generated/virtual.metadata'
import { setupVirtual } from './setup.component'

/**
 * Окно для длинных списков: коллекции внутри рисуют только видимые элементы; своего узла нет.
 * AGENTS.md (Angular), «Окно — `<ng-container so-virtual>`».
 */
@Directive({
	selector: '[so-virtual]',
	providers: [provideElevator()],
})
export class TVirtualComponent extends TVirtualSurface<IVirtual> {
	constructor() {
		super(setupVirtual)
	}
}
