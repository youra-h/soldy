import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzDropdownModule } from 'ng-zorro-antd/dropdown'
import { NzMenuModule } from 'ng-zorro-antd/menu'

/**
 * The soldy menu preview in NG-ZORRO: `nz-dropdown` with an `nz-menu` —
 * groups with titles, a submenu with a submenu inside (`nz-submenu`), a
 * disabled action and a danger one. The menu has no checkbox or radio items:
 * they are items with `role` and a mark. It opens on click (`nzTrigger`), as
 * the soldy menu does: the default is hover.
 */
@Component({
	selector: 'bench-menu',
	imports: [NzButtonModule, NzDropdownModule, NzMenuModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.mark {
			display: inline-block;
			width: 16px;
		}
		.shortcut {
			margin-inline-start: 24px;
			opacity: 0.6;
		}
	`,
	template: `
		<button nz-button nz-dropdown nzTrigger="click" [nzDropdownMenu]="menu">Действия</button>
		<nz-dropdown-menu #menu="nzDropdownMenu">
			<ul nz-menu>
				<li nz-menu-group nzTitle="Вид">
					<ul>
						@for (item of view; track item[0]) {
							<li
								nz-menu-item
								role="menuitemcheckbox"
								[attr.aria-checked]="checked().has(item[0])"
								(click)="toggle(item[0])"
							>
								<span class="mark">{{ checked().has(item[0]) ? '✓' : '' }}</span
								>{{ item[1] }}
							</li>
						}
					</ul>
				</li>
				<li nz-menu-divider></li>
				<li nz-menu-group nzTitle="Сортировка">
					<ul>
						@for (item of sorts; track item[0]) {
							<li
								nz-menu-item
								role="menuitemradio"
								[attr.aria-checked]="sort() === item[0]"
								(click)="sort.set(item[0])"
							>
								<span class="mark">{{ sort() === item[0] ? '•' : '' }}</span
								>{{ item[1] }}
							</li>
						}
					</ul>
				</li>
				<li nz-menu-divider></li>
				<li nz-menu-item>Изменить<span class="shortcut">Ctrl+E</span></li>
				<li nz-menu-item>Дублировать<span class="shortcut">Ctrl+D</span></li>
				<li nz-submenu nzTitle="Поделиться">
					<ul>
						<li nz-menu-item>Ссылка</li>
						<li nz-menu-item>Почта</li>
						<li nz-submenu nzTitle="Мессенджеры">
							<ul>
								<li nz-menu-item>Telegram</li>
								<li nz-menu-item>WhatsApp</li>
							</ul>
						</li>
					</ul>
				</li>
				<li nz-menu-item nzDisabled>В архив</li>
				<li nz-menu-divider></li>
				<li nz-menu-item nzDanger>Удалить<span class="shortcut">Del</span></li>
			</ul>
		</nz-dropdown-menu>
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
