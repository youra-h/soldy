import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core'
import { PropertyFieldComponent } from './property-field.component'

export type TPropertyType = 'boolean' | 'string' | 'number' | 'select'

export interface IPropertyDefinition {
	type: TPropertyType
	default?: any
	options?: any[]
	placeholder?: string
}

export type TPropertiesSchema = Record<string, IPropertyDefinition>

/**
 * Универсальная панель свойств для playground'ов.
 * Автоматически генерирует поля на основе схемы (schema-driven).
 */
@Component({
	selector: 'demo-properties',
	standalone: true,
	imports: [PropertyFieldComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="properties-panel">
			@for (entry of entries; track entry.key) {
				@switch (entry.def.type) {
					@case ('boolean') {
						<demo-property-field [label]="entry.key">
							<input
								type="checkbox"
								class="properties-panel__checkbox"
								[checked]="entry.value"
								(change)="update(entry.key, $any($event.target).checked)"
							/>
						</demo-property-field>
					}
					@case ('string') {
						<demo-property-field [label]="entry.key">
							<input
								type="text"
								class="properties-panel__input"
								[value]="entry.value"
								[placeholder]="entry.def.placeholder"
								(input)="update(entry.key, $any($event.target).value)"
							/>
						</demo-property-field>
					}
					@case ('number') {
						<demo-property-field [label]="entry.key">
							<input
								type="number"
								class="properties-panel__input"
								[value]="entry.value"
								(input)="update(entry.key, $any($event.target).valueAsNumber)"
							/>
						</demo-property-field>
					}
					@case ('select') {
						<demo-property-field [label]="entry.key">
							<select
								class="properties-panel__select"
								[value]="entry.value"
								(change)="update(entry.key, $any($event.target).value)"
							>
								@for (option of entry.def.options; track $index) {
									<option [value]="optionValue(option)">{{ optionLabel(option) }}</option>
								}
							</select>
						</demo-property-field>
					}
				}
			}

			@if (hasVisibility) {
				<div class="properties-panel__actions">
					<button class="properties-panel__action-btn" (click)="showRequested.emit()">
						Show
					</button>
					<button class="properties-panel__action-btn" (click)="hideRequested.emit()">
						Hide
					</button>
				</div>
			}
		</div>
	`,
})
export class PropertiesComponent {
	@Input() schema: TPropertiesSchema = {}
	@Input() value: Record<string, any> = {}

	@Output() changed = new EventEmitter<Record<string, any>>()
	@Output() showRequested = new EventEmitter<void>()
	@Output() hideRequested = new EventEmitter<void>()

	protected get entries() {
		return Object.entries(this.schema).map(([key, def]) => ({
			key,
			def,
			value: this.value[key] ?? def.default,
		}))
	}

	protected get hasVisibility(): boolean {
		return 'visible' in this.schema
	}

	protected update(key: string, nextValue: any): void {
		this.changed.emit({ ...this.value, [key]: nextValue })
	}

	protected optionValue(option: any): any {
		return typeof option === 'object' && option !== null ? option.value : option
	}

	protected optionLabel(option: any): string {
		if (typeof option === 'object' && option !== null) {
			return option.label ?? String(option.value)
		}

		return String(option)
	}
}
