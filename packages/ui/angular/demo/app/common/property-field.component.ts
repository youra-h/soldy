import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

@Component({
	selector: 'demo-property-field',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="property-field">
			<label class="property-field__label">{{ label }}:</label>
			<div class="property-field__control"><ng-content></ng-content></div>
		</div>
	`,
})
export class PropertyFieldComponent {
	@Input() label = ''
}
