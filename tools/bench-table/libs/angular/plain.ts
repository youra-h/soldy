import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core'
import { COLUMNS, type TRec } from '../data'
import { nextSort, sorted, type TSort } from '../sort'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/**
 * Нижняя граница: таблица на голом Angular — `@for` по строкам с ключом,
 * нативные чекбоксы, выбор в `Set` сигнала, сортировка по клику на заголовок.
 * Как голая таблица Vue: ни доступности сверх тегов, ни клавиатуры.
 */
@Component({
	selector: 'bench-plain',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<table>
			<thead>
				<tr>
					<th><input type="checkbox" [checked]="all()" (change)="toggleAll()" /></th>
					@for (c of columns; track c.field) {
						<th [attr.data-col]="c.field" (click)="sortBy(c.field)">{{ c.text }}</th>
					}
				</tr>
			</thead>
			<tbody>
				@for (r of shown(); track r.id) {
					<tr>
						<td>
							<input
								type="checkbox"
								[checked]="selected().has(r.id)"
								(change)="toggle(r.id)"
							/>
						</td>
						@for (c of columns; track c.field) {
							<td>{{ r[c.field] }}</td>
						}
					</tr>
				}
			</tbody>
		</table>
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly columns = COLUMNS
	protected readonly sort = signal<TSort>(null)
	protected readonly selected = signal(new Set<string | number>())
	protected readonly shown = computed(() => sorted(this.rows(), this.sort()))
	protected readonly all = computed(
		() => this.rows().length > 0 && this.selected().size === this.rows().length,
	)

	protected toggleAll() {
		this.selected.set(this.all() ? new Set() : new Set(this.rows().map((r) => r.id)))
	}

	protected toggle(id: string | number) {
		const next = new Set(this.selected())

		if (!next.delete(id)) next.add(id)
		this.selected.set(next)
	}

	protected sortBy(field: string) {
		this.sort.set(nextSort(this.sort(), field))
	}
}
