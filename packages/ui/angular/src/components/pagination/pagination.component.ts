import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IPagination } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TPaginationItemComponent } from './item'
import { TPaginationSurface } from '../../generated/pagination.metadata'
import { setupPagination } from './setup.component'

/**
 * Постраничная навигация: стрелка «назад», список страниц, стрелка «вперёд».
 * Имя корню (`aria_label`) даёт приложение: что листают, знает только оно.
 */
@Component({
	selector: 'nav[so-pagination], [so-pagination]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TButtonComponent,
		TIconComponent,
		TPaginationItemComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './pagination.component.html',
})
export class TPaginationComponent extends TPaginationSurface<IPagination> {
	constructor() {
		super((ctrl, inputs) => setupPagination(ctrl, inputs, this.engine), { strategy: 'host' })
	}
}
