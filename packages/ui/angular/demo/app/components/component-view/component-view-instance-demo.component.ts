import {
	ChangeDetectionStrategy,
	Component,
	inject,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges,
} from '@angular/core'
import { TComponentViewComponent } from '@soldy/ui-angular'
import { TComponentView } from '@soldy/core'
import { PanelDemoComponent } from '../../common/panel-demo.component'
import { EventLogService } from '../../common/event-log.service'

@Component({
	selector: 'demo-component-view-instance',
	standalone: true,
	imports: [TComponentViewComponent, PanelDemoComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<demo-panel info="Managed by TComponentView instance">
			<soldy-component-view [ctrl]="instance">
				<div class="cv-demo-content">
					<div class="cv-demo-title">Instance Demo</div>
					<div class="cv-demo-subtitle">Component with instance</div>
				</div>
			</soldy-component-view>
		</demo-panel>
	`,
})
export class ComponentViewInstanceDemoComponent implements OnInit, OnChanges, OnDestroy {
	@Input() visible = true
	@Input() rendered = true
	@Input() tag = 'div'

	instance!: TComponentView

	private readonly logService = inject(EventLogService)
	private _offMiddleware?: () => void

	ngOnInit(): void {
		this.instance = new TComponentView({
			tag: this.tag,
			rendered: this.rendered,
			visible: this.visible,
		})

		this._offMiddleware = (this.instance.events as any).use((ctx: any) => {
			const payload = ctx.args.length === 1 ? ctx.args[0] : ctx.args

			this.logService.log({
				timestamp: new Date().toISOString(),
				source: 'core',
				name: String(ctx.event),
				payload,
			})
		})
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (!this.instance) return

		const sync: Record<string, any> = {
			tag: this.tag,
			rendered: this.rendered,
			visible: this.visible,
		}

		for (const [key, value] of Object.entries(sync)) {
			if ((this.instance as any)[key] !== value) {
				;(this.instance as any)[key] = value
			}
		}
	}

	ngOnDestroy(): void {
		this._offMiddleware?.()
	}

	show(): void {
		this.instance?.show()
	}

	hide(): void {
		this.instance?.hide()
	}
}
