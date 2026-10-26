import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatSlideToggle } from '@angular/material/slide-toggle'

@Component({
	selector: 'bench-switch',
	imports: [MatSlideToggle],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<mat-slide-toggle>Включено</mat-slide-toggle>`,
})
export default class SwitchPage {}
