import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IPopover } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../adapter'
import { TButtonComponent } from '../button'
import { TFrameComponent } from '../frame'
import { TIconComponent } from '../icon'
import { TPopoverSurface } from '../../generated/popover.metadata'
import { setupPopover } from './setup.component'

/**
 * Немодальная панель у триггера; корень — элемент потребителя и якорь панели.
 * AGENTS.md (Angular), «Popover и Tooltip — Frame в шаблоне, триггер — шаблон слота».
 */
@Component({
	selector: 'span[so-popover], [so-popover]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TFrameComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './popover.component.html',
})
export class TPopoverComponent extends TPopoverSurface<IPopover> {
	constructor() {
		super(setupPopover, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	/** Крестик: куда вернуть фокус, решает плагин фокуса. */
	protected close(): void {
		const popover = this.instance()

		if (popover) popover.open = false
	}
}
