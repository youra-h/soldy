import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TLabelComponent, TSwitchComponent } from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-switch',
	imports: [TLabelComponent, TSwitchComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<label so-label text="Включено"><span so-switch></span></label>`,
})
export default class SwitchPage {}
