import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { SlotDirective, TButtonComponent } from '@soldy/ui-angular'
import type { TComponentSize, TComponentVariant } from '@soldy/core'

/**
 * SlotDirective импортирует ПОТРЕБИТЕЛЬ: `<ng-template slot="...">` пишется
 * здесь, а директивы в Angular применяются там, где объявлены.
 */
@Component({
	selector: 'demo-button-slots',
	standalone: true,
	imports: [TButtonComponent, SlotDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="demo-container">
			<h3 class="demo-title">Views & Children</h3>

			<div class="demo-grid">
				<div class="demo-section">
					<h4 class="demo-section-title">Filled</h4>
					<div class="demo-section-content">
						<soldy-button
							[size]="size"
							[variant]="variant"
							view="filled"
							text="Default"
							[disabled]="disabled"
						/>
						<soldy-button [size]="size" [variant]="variant" view="filled" [disabled]="disabled">
							<span>Custom children</span>
						</soldy-button>
					</div>
				</div>

				<div class="demo-section">
					<h4 class="demo-section-title">Plain</h4>
					<div class="demo-section-content">
						<soldy-button [size]="size" [variant]="variant" view="plain" text="Default" />
						<soldy-button [size]="size" [variant]="variant" view="plain">
							<span>Custom children</span>
						</soldy-button>
					</div>
				</div>

				<div class="demo-section">
					<h4 class="demo-section-title">Outlined</h4>
					<div class="demo-section-content">
						<soldy-button [size]="size" [variant]="variant" view="outlined" text="Default" />
						<soldy-button [size]="size" [variant]="variant" view="outlined">
							<span>Custom children</span>
						</soldy-button>
					</div>
				</div>
			</div>

			<h3 class="demo-title">Slots</h3>

			<div class="demo-section-content">
				<soldy-button [size]="size" [variant]="variant" [disabled]="disabled" text="Both">
					<span slot="leading">◀</span>
					<span slot="trailing">▶</span>
				</soldy-button>

				<soldy-button [size]="size" [variant]="variant" [disabled]="disabled" text="Scoped">
					<ng-template slot="default" let-text>
						<b>{{ text }}!</b>
					</ng-template>
				</soldy-button>
			</div>

			<div class="demo-info">
				Слоты leading / default (scope text) / trailing. Простые проецируются по
				атрибуту slot, scoped — через ng-template.
			</div>
		</div>
	`,
})
export class ButtonSlotsDemoComponent {
	@Input() size: TComponentSize = 'normal'
	@Input() variant: TComponentVariant = 'normal'
	@Input() disabled = false
}
