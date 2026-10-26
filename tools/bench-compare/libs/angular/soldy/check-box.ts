import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TCheckBoxComponent, TLabelComponent } from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-check-box',
	imports: [TCheckBoxComponent, TLabelComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<label so-label text="Согласен"><span so-check-box></span></label>`,
})
export default class CheckBoxPage {}
