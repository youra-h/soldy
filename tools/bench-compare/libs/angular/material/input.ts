import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'

@Component({
	selector: 'bench-input',
	imports: [MatFormFieldModule, MatInputModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-form-field>
			<input matInput placeholder="Введите текст" />
		</mat-form-field>
	`,
})
export default class InputPage {}
