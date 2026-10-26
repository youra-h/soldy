import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { MatButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatMenuModule } from '@angular/material/menu'

/**
 * The soldy menu preview in Material: a group of checkboxes, a group of
 * radios, actions with shortcuts, a submenu with a submenu inside, a disabled
 * action and a destructive one. Material has no checkbox, radio or group
 * items: they are `mat-menu-item` with `role` and a mark, kept open by
 * stopping the click (the menu closes on an item click), group labels are
 * plain text; submenus are nested menus (`matMenuTriggerFor` on an item), as
 * the docs build them.
 */
@Component({
	selector: 'bench-menu',
	imports: [MatButton, MatDivider, MatMenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.group {
			padding: 8px 16px 0;
			font-size: 12px;
			opacity: 0.7;
		}
		.mark {
			display: inline-block;
			width: 20px;
		}
		.shortcut {
			margin-inline-start: 24px;
			opacity: 0.7;
		}
		.negative {
			color: var(--mat-sys-error);
		}
	`,
	template: `
		<button matButton [matMenuTriggerFor]="menu">Действия</button>
		<mat-menu #menu="matMenu">
			<div class="group">Вид</div>
			@for (item of view; track item[0]) {
				<button
					mat-menu-item
					role="menuitemcheckbox"
					[attr.aria-checked]="checked().has(item[0])"
					(click)="toggle(item[0]); $event.stopPropagation()"
				>
					<span class="mark">{{ checked().has(item[0]) ? '✓' : '' }}</span
					>{{ item[1] }}
				</button>
			}
			<mat-divider />
			<div class="group">Сортировка</div>
			@for (item of sorts; track item[0]) {
				<button
					mat-menu-item
					role="menuitemradio"
					[attr.aria-checked]="sort() === item[0]"
					(click)="sort.set(item[0]); $event.stopPropagation()"
				>
					<span class="mark">{{ sort() === item[0] ? '•' : '' }}</span
					>{{ item[1] }}
				</button>
			}
			<mat-divider />
			<button mat-menu-item>Изменить<span class="shortcut">Ctrl+E</span></button>
			<button mat-menu-item>Дублировать<span class="shortcut">Ctrl+D</span></button>
			<button mat-menu-item [matMenuTriggerFor]="share">Поделиться</button>
			<button mat-menu-item disabled>В архив</button>
			<mat-divider />
			<button mat-menu-item class="negative">Удалить<span class="shortcut">Del</span></button>
		</mat-menu>
		<mat-menu #share="matMenu">
			<button mat-menu-item>Ссылка</button>
			<button mat-menu-item>Почта</button>
			<button mat-menu-item [matMenuTriggerFor]="messengers">Мессенджеры</button>
		</mat-menu>
		<mat-menu #messengers="matMenu">
			<button mat-menu-item>Telegram</button>
			<button mat-menu-item>WhatsApp</button>
		</mat-menu>
	`,
})
export default class MenuPage {
	protected readonly view = [
		['grid', 'Сетка'],
		['ruler', 'Линейка'],
	] as const
	protected readonly sorts = [
		['name', 'По имени'],
		['date', 'По дате'],
	] as const
	readonly checked = signal<ReadonlySet<string>>(new Set(['grid']))
	readonly sort = signal('name')

	toggle(value: string): void {
		const next = new Set(this.checked())

		if (!next.delete(value)) next.add(value)

		this.checked.set(next)
	}
}
