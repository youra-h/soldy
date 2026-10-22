import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy-ui/core'
import { TButtonSurface } from '../../generated/button.metadata'
import { setupButton } from './setup.component'

/** Кнопка: корень — сам элемент потребителя (`<button so-button>`, `<a so-button href>`). */
@Component({
	selector: 'button[so-button], [so-button]',
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './button.component.html',
})
export class TButtonComponent extends TButtonSurface<IButton> {
	constructor() {
		super(setupButton, { strategy: 'host' })
	}
}
