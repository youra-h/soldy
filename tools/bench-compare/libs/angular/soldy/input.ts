import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TInputComponent } from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-input',
	imports: [TInputComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<div so-input placeholder="Введите текст"></div>`,
})
export default class InputPage {}
