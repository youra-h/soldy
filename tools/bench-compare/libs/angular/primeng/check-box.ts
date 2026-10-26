import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Checkbox } from 'primeng/checkbox'

let copies = 0

/** A checkbox with a label bound by `for`, as the PrimeNG docs label it. */
@Component({
	selector: 'bench-check-box',
	imports: [Checkbox],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<span class="bench-field">
			<p-checkbox [binary]="true" [inputId]="id" />
			<label [for]="id">Согласен</label>
		</span>
	`,
})
export default class CheckBoxPage {
	protected readonly id = `check-box-${++copies}`
}
