import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IScroller } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, TextPipe } from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TScrollerSurface } from '../../generated/scroller.metadata'
import { setupScroller } from './setup.component'

/**
 * Лента содержимого в одну строку с кнопками «назад» и «вперёд» по сторонам вьюпорта.
 * Значок кнопки — шаблон слота: есть ли что-то в `<ng-content>`, Angular не сообщает.
 */
@Component({
	selector: 'div[so-scroller], [so-scroller]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TextPipe,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './scroller.component.html',
})
export class TScrollerComponent extends TScrollerSurface<IScroller> {
	constructor() {
		super(setupScroller, { strategy: 'host' })
	}
}
