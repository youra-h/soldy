import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatCheckbox } from '@angular/material/checkbox'

@Component({
	selector: 'bench-check-box',
	imports: [MatCheckbox],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<mat-checkbox>Согласен</mat-checkbox>`,
})
export default class CheckBoxPage {}
