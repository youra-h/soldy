import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzButtonModule } from 'ng-zorro-antd/button'

@Component({
	selector: 'bench-button',
	imports: [NzButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<button nz-button>Кнопка</button>`,
})
export default class ButtonPage {}
