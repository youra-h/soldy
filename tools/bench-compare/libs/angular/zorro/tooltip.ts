import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

@Component({
	selector: 'bench-tooltip',
	imports: [NzButtonModule, NzTooltipModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<button nz-button nz-tooltip nzTooltipTitle="Короткое пояснение к кнопке">
		Наведи
	</button>`,
})
export default class TooltipPage {}
