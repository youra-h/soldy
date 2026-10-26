import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatButton } from '@angular/material/button'

@Component({
	selector: 'bench-button',
	imports: [MatButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<button matButton>Кнопка</button>`,
})
export default class ButtonPage {}
