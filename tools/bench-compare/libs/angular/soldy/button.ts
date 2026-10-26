import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TButtonComponent } from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-button',
	imports: [TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<button so-button text="Кнопка"></button>`,
})
export default class ButtonPage {}
