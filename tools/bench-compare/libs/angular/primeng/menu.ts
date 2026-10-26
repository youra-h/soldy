import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core'
import type { MenuItem } from 'primeng/api'
import { Button } from 'primeng/button'
import { TieredMenu } from 'primeng/tieredmenu'

/**
 * The soldy menu preview in PrimeNG: a popup `p-tieredmenu` — its nested
 * items are the submenu with a submenu inside, a disabled action and a
 * destructive one. TieredMenu has no checkbox, radio or group items: the
 * checkbox and radio items are items with a mark in the item template (the
 * docs' «Template» example, shortcuts there too), group labels are disabled
 * items.
 */
@Component({
	selector: 'bench-menu',
	imports: [Button, TieredMenu],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-button label="Действия" (onClick)="menu.toggle($event)" />
		<p-tieredmenu #menu [model]="model()" [popup]="true">
			<ng-template #item let-item let-hasSubmenu="hasSubmenu">
				<a class="p-tieredmenu-item-link" [style]="item.style">
					<span style="display: inline-block; width: 16px">{{ item['mark'] }}</span>
					<span class="p-tieredmenu-item-label">{{ item.label }}</span>
					@if (item['shortcut']) {
						<span style="margin-inline-start: auto; opacity: 0.7">{{
							item['shortcut']
						}}</span>
					}
					@if (hasSubmenu) {
						<span style="margin-inline-start: auto">›</span>
					}
				</a>
			</ng-template>
		</p-tieredmenu>
	`,
})
export default class MenuPage {
	readonly checked = signal<ReadonlySet<string>>(new Set(['grid']))
	readonly sort = signal('name')
	readonly model = computed<MenuItem[]>(() => [
		{ label: 'Вид', disabled: true },
		this.checkbox('grid', 'Сетка'),
		this.checkbox('ruler', 'Линейка'),
		{ separator: true },
		{ label: 'Сортировка', disabled: true },
		this.radio('name', 'По имени'),
		this.radio('date', 'По дате'),
		{ separator: true },
		{ label: 'Изменить', shortcut: 'Ctrl+E' },
		{ label: 'Дублировать', shortcut: 'Ctrl+D' },
		{
			label: 'Поделиться',
			items: [
				{ label: 'Ссылка' },
				{ label: 'Почта' },
				{ label: 'Мессенджеры', items: [{ label: 'Telegram' }, { label: 'WhatsApp' }] },
			],
		},
		{ label: 'В архив', disabled: true },
		{ separator: true },
		{ label: 'Удалить', shortcut: 'Del', style: { color: 'var(--p-red-500)' } },
	])

	private checkbox(value: string, label: string): MenuItem {
		return {
			label,
			mark: this.checked().has(value) ? '✓' : '',
			command: () => {
				const next = new Set(this.checked())

				if (!next.delete(value)) next.add(value)

				this.checked.set(next)
			},
		}
	}

	private radio(value: string, label: string): MenuItem {
		return {
			label,
			mark: this.sort() === value ? '•' : '',
			command: () => this.sort.set(value),
		}
	}
}
