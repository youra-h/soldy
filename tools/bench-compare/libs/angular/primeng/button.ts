import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Button } from 'primeng/button'

@Component({
	selector: 'bench-button',
	imports: [Button],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<p-button label="Кнопка" />`,
})
export default class ButtonPage {}
