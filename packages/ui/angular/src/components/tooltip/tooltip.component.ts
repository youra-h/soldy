import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITooltip } from '@soldy-ui/core'
import { AttributesDirective } from '../../adapter'
import { TFrameComponent } from '../frame'
import { TTooltipSurface } from '../../generated/tooltip.metadata'
import { setupTooltip } from './setup.component'

/**
 * Подсказка у триггера; корень — элемент потребителя, якорь панели и цель наведения.
 * AGENTS.md (Angular), «Popover и Tooltip — Frame в шаблоне, триггер — шаблон слота».
 */
@Component({
	selector: 'span[so-tooltip], [so-tooltip]',
	imports: [NgTemplateOutlet, AttributesDirective, TFrameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tooltip.component.html',
})
export class TTooltipComponent extends TTooltipSurface<ITooltip> {
	constructor() {
		super(setupTooltip, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}
}
