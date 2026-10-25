import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { TTableComponent, TVirtualComponent } from '@soldy-ui/angular'
import type { TRec } from '../data'
import { columns, tableProps, virtual, width } from '../soldy-setup'

export { sel } from '../soldy-setup'

/**
 * Таблица soldy на адаптере Angular — те же колонки, флаги и обёртки, что у Vue.
 * Пропсы таблицы — по именам: не заданный флагом — `undefined`, и его адаптер не
 * пишет. Обёртка ширины стоит всегда: без флага `width` у неё нет стиля, и
 * блочная таблица в ней та же, что без неё.
 */
@Component({
	selector: 'bench-soldy',
	imports: [TTableComponent, TVirtualComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (virtual) {
			<div class="bench-scroll" style="height: 800px; overflow: auto">
				<ng-container so-virtual>
					<div
						so-table
						[items]="items()"
						[columns]="columns"
						[mode]="props.mode"
						[aria_label]="props.aria_label"
						[reorderable]="props.reorderable"
						[reorderPreview]="props.reorderPreview"
						[resizable]="props.resizable"
						[resizePreview]="props.resizePreview"
						[columnFit]="props.columnFit"
						[trackBy]="props.trackBy"
					></div>
				</ng-container>
			</div>
		} @else {
			<div [style.width.px]="width">
				<div
					so-table
					[items]="items()"
					[columns]="columns"
					[mode]="props.mode"
					[aria_label]="props.aria_label"
					[reorderable]="props.reorderable"
					[reorderPreview]="props.reorderPreview"
					[resizable]="props.resizable"
					[resizePreview]="props.resizePreview"
					[columnFit]="props.columnFit"
					[trackBy]="props.trackBy"
				></div>
			</div>
		}
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly items = computed(() => this.rows().map((data) => ({ data })))
	protected readonly columns = columns
	protected readonly props = tableProps
	protected readonly virtual = virtual
	protected readonly width = width
}
