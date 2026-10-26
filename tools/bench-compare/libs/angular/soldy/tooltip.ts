import { ChangeDetectionStrategy, Component } from '@angular/core'
import {
	AttributesDirective,
	SlotDirective,
	TButtonComponent,
	TTooltipComponent,
} from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/templates.ts` (`TooltipPreview`). */
@Component({
	selector: 'bench-tooltip',
	imports: [TTooltipComponent, TButtonComponent, SlotDirective, AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<span so-tooltip>
			<ng-template slot="trigger" let-triggerAria="triggerAria">
				<button so-button text="Наведи" [so-attributes]="triggerAria"></button>
			</ng-template>
			Короткое пояснение к кнопке
		</span>
	`,
})
export default class TooltipPage {}
