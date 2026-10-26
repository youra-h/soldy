import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzInputModule } from 'ng-zorro-antd/input'

@Component({
	selector: 'bench-input',
	imports: [NzInputModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<input nz-input placeholder="Введите текст" />`,
})
export default class InputPage {}
