import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatButton } from '@angular/material/button'
import { MatTooltip } from '@angular/material/tooltip'

@Component({
	selector: 'bench-tooltip',
	imports: [MatButton, MatTooltip],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<button matButton matTooltip="Короткое пояснение к кнопке">Наведи</button>`,
})
export default class TooltipPage {}
