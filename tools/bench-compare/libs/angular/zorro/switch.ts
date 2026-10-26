import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzSwitchModule } from 'ng-zorro-antd/switch'

/** The NG-ZORRO switch has no label of its own: a `label` around it names it. */
@Component({
	selector: 'bench-switch',
	imports: [NzSwitchModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<label class="bench-field"><nz-switch /> Включено</label>`,
})
export default class SwitchPage {}
