import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox'

@Component({
	selector: 'bench-check-box',
	imports: [NzCheckboxModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<label nz-checkbox>Согласен</label>`,
})
export default class CheckBoxPage {}
