import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IComponentView } from '@soldy-ui/core'
import { TComponentViewSurface } from '../../generated/component-view.metadata'
import { setupComponentView } from './setup.component'

/** Визуальный TComponentView: корень — элемент потребителя (`<section so-component-view>`). */
@Component({
	selector: '[so-component-view]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentViewComponent extends TComponentViewSurface<IComponentView> {
	constructor() {
		super(setupComponentView, { strategy: 'host' })
	}
}
