import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IFrame } from '@soldy-ui/core'
import { TFrameSurface } from '../../generated/frame.metadata'
import { setupFrame } from './setup.component'

/**
 * Слой поверх страницы: в цель `target` уезжает сам элемент потребителя.
 * AGENTS.md (Angular), «Слой уезжает в цель сам», «Гидратации у слоя нет».
 */
@Component({
	selector: 'div[so-frame], [so-frame]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { ngSkipHydration: 'true' },
	templateUrl: './frame.component.html',
})
export class TFrameComponent extends TFrameSurface<IFrame> {
	constructor() {
		super(setupFrame, {
			strategy: 'host',
			teleport: { target: 'target', contained: 'contained' },
		})
	}
}
