import { Directive } from '@angular/core'
import type { IDragAndDrop } from '@soldy-ui/core'
import { provideElevator } from '../../adapter'
import { TDragAndDropSurface } from '../../generated/drag-and-drop.metadata'
import { setupDragAndDrop } from './setup.component'

/**
 * Перестановка элементов коллекций внутри перетаскиванием; своего узла нет.
 * AGENTS.md (Angular), «Перестановка — `<ng-container so-drag-and-drop>`».
 */
@Directive({
	selector: '[so-drag-and-drop]',
	providers: [provideElevator()],
})
export class TDragAndDropComponent extends TDragAndDropSurface<IDragAndDrop> {
	constructor() {
		super(setupDragAndDrop)
	}
}
