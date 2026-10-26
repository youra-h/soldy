import { ChangeDetectionStrategy, Component } from '@angular/core'
import { InputText } from 'primeng/inputtext'

@Component({
	selector: 'bench-input',
	imports: [InputText],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<input pInputText placeholder="Введите текст" />`,
})
export default class InputPage {}
