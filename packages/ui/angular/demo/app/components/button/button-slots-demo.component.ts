import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { TButtonComponent } from '@soldy/ui-angular'
import type { TComponentSize, TComponentVariant } from '@soldy/core'

@Component({
	selector: 'demo-button-slots',
	standalone: true,
	imports: [TButtonComponent],
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

			<div class="demo-info">Demonstrating different views with children</div>
		</div>
	`,
})
export class ButtonSlotsDemoComponent {
	@Input() size: TComponentSize = 'normal'
	@Input() variant: TComponentVariant = 'normal'
	@Input() disabled = false
}
