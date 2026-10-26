import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Button } from 'primeng/button'
import { Tooltip } from 'primeng/tooltip'

@Component({
	selector: 'bench-tooltip',
	imports: [Button, Tooltip],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<p-button label="Наведи" pTooltip="Короткое пояснение к кнопке" />`,
})
export default class TooltipPage {}
