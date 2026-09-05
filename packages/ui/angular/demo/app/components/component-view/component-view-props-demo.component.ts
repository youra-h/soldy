import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	inject,
	Input,
	OnDestroy,
	ViewChild,
} from '@angular/core'
import { TComponentViewComponent } from '@soldy/ui-angular'
import { PanelDemoComponent } from '../../common/panel-demo.component'
import { EventLogService } from '../../common/event-log.service'
import { subscribeOutputs } from '../../common/output-logger'
import { COMPONENT_VIEW_EVENTS } from '../../common/items'

@Component({
	selector: 'demo-component-view-props',
	standalone: true,
	imports: [TComponentViewComponent, PanelDemoComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<demo-panel info="Controlled by props from Properties panel">
			<soldy-component-view [rendered]="rendered" [visible]="visible" [tag]="tag">
				<div class="cv-demo-content">
					<div class="cv-demo-title">Props Demo</div>
					<div class="cv-demo-subtitle">Component with props</div>
				</div>
			</soldy-component-view>
		</demo-panel>
	`,
})
export class ComponentViewPropsDemoComponent implements AfterViewInit, OnDestroy {
	@Input() visible = true
	@Input() rendered = true
	@Input() tag = 'div'

	@ViewChild(TComponentViewComponent) private componentView?: TComponentViewComponent

	private readonly logService = inject(EventLogService)
	private _off?: () => void

	ngAfterViewInit(): void {
		if (this.componentView) {
			this._off = subscribeOutputs(this.componentView, COMPONENT_VIEW_EVENTS, this.logService)
		}
	}

	ngOnDestroy(): void {
		this._off?.()
	}
}
