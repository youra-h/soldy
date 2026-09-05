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
import { TButtonComponent } from '@soldy/ui-angular'
import { TButton } from '@soldy/core'
import { PanelDemoComponent } from '../../common/panel-demo.component'
import { EventLogService } from '../../common/event-log.service'
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

@Component({
	selector: 'demo-button-instance',
	standalone: true,
	imports: [TButtonComponent, PanelDemoComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<demo-panel info="Managed by TButton instance">
			<soldy-button [ctrl]="instance"></soldy-button>
		</demo-panel>
	`,
})
export class ButtonInstanceDemoComponent implements OnInit, OnChanges, OnDestroy {
	@Input() visible = true
	@Input() rendered = true
	@Input() size: TComponentSize = 'normal'
	@Input() variant: TComponentVariant = 'normal'
	@Input() view: TButtonView = 'filled'
	@Input() disabled = false
	@Input() text = 'Button'

	instance!: TButton

	private readonly logService = inject(EventLogService)
	private _offMiddleware?: () => void

	ngOnInit(): void {
		this.instance = new TButton({
			rendered: this.rendered,
			visible: this.visible,
			size: this.size,
			variant: this.variant,
			view: this.view,
			disabled: this.disabled,
			text: this.text,
		})

		// Логируем ВСЕ события core-инстанса через TEvented middleware.
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
			rendered: this.rendered,
			visible: this.visible,
			size: this.size,
			variant: this.variant,
			view: this.view,
			disabled: this.disabled,
			text: this.text,
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
