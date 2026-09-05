import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	inject,
	Input,
	OnDestroy,
	ViewChild,
} from '@angular/core'
import { TButtonComponent } from '@soldy/ui-angular'
import { PanelDemoComponent } from '../../common/panel-demo.component'
import { EventLogService } from '../../common/event-log.service'
import { subscribeOutputs } from '../../common/output-logger'
import { BUTTON_EVENTS } from '../../common/items'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

@Component({
	selector: 'demo-button-props',
	standalone: true,
	imports: [TButtonComponent, PanelDemoComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<demo-panel info="Props-based demo">
			<soldy-button
				[rendered]="rendered"
				[visible]="visible"
				[size]="size"
				[variant]="variant"
				[view]="view"
				[disabled]="disabled"
				[text]="text"
			></soldy-button>
		</demo-panel>
	`,
})
export class ButtonPropsDemoComponent implements AfterViewInit, OnDestroy {
	@Input() visible = true
	@Input() rendered = true
	@Input() size: TComponentSize = 'normal'
	@Input() variant: TComponentVariant = 'normal'
	@Input() view: TButtonView = 'filled'
	@Input() disabled = false
	@Input() text = 'Button'

	@ViewChild(TButtonComponent) private button?: TButtonComponent

	private readonly logService = inject(EventLogService)
	private _off?: () => void

	ngAfterViewInit(): void {
		if (this.button) {
			this._off = subscribeOutputs(this.button, BUTTON_EVENTS, this.logService)
		}
	}

	ngOnDestroy(): void {
		this._off?.()
	}
}
