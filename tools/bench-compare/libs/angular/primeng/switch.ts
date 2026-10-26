import { ChangeDetectionStrategy, Component } from '@angular/core'
import { ToggleSwitch } from 'primeng/toggleswitch'

let copies = 0

/** A switch with a label bound by `for`, as the PrimeNG docs label it. */
@Component({
	selector: 'bench-switch',
	imports: [ToggleSwitch],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<span class="bench-field">
			<p-toggleswitch [inputId]="id" />
			<label [for]="id">Включено</label>
		</span>
	`,
})
export default class SwitchPage {
	protected readonly id = `switch-${++copies}`
}
