import { ChangeDetectionStrategy, Component } from '@angular/core'
import {
	AttributesDirective,
	SlotDirective,
	TButtonComponent,
	TCalendarComponent,
	TMenuCheckboxItemComponent,
	TMenuComponent,
	TMenuGroupComponent,
	TMenuItemComponent,
	TMenuPopoverItemComponent,
	TMenuRadioGroupComponent,
	TMenuRadioItemComponent,
	TMenuSeparatorComponent,
	TMenuSubmenuComponent,
} from '@soldy-ui/angular'

/** The preview of `packages/playground/vue/src/hosts/angular/templates.ts` (`MenuPreview`). */
@Component({
	selector: 'bench-menu',
	imports: [
		TMenuComponent,
		TMenuItemComponent,
		TMenuCheckboxItemComponent,
		TMenuRadioGroupComponent,
		TMenuRadioItemComponent,
		TMenuGroupComponent,
		TMenuSeparatorComponent,
		TMenuSubmenuComponent,
		TMenuPopoverItemComponent,
		TCalendarComponent,
		TButtonComponent,
		SlotDirective,
		AttributesDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<span so-menu>
			<ng-template
				slot="trigger"
				let-triggerAria="triggerAria"
				let-triggerDataset="triggerDataset"
			>
				<button
					so-button
					text="Действия"
					[so-attributes]="{ ...triggerAria, ...triggerDataset }"
				></button>
			</ng-template>
			<ng-template slot="default">
				<div so-menu-group label="Вид">
					<div so-menu-checkbox-item value="grid" text="Сетка" selected></div>
					<div so-menu-checkbox-item value="ruler" text="Линейка"></div>
				</div>
				<div so-menu-separator></div>
				<div so-menu-radio-group label="Сортировка" value="name">
					<div so-menu-radio-item value="name" text="По имени"></div>
					<div so-menu-radio-item value="date" text="По дате"></div>
				</div>
				<div so-menu-separator></div>
				<div so-menu-item value="edit" text="Изменить">
					<span slot="trailing">Ctrl+E</span>
				</div>
				<div so-menu-item value="copy" text="Дублировать">
					<span slot="trailing">Ctrl+D</span>
				</div>
				<div so-menu-submenu value="share" text="Поделиться">
					<ng-template slot="default">
						<div so-menu-item value="link" text="Ссылка"></div>
						<div so-menu-item value="mail" text="Почта"></div>
						<div so-menu-submenu value="messengers" text="Мессенджеры">
							<ng-template slot="default">
								<div so-menu-item value="telegram" text="Telegram"></div>
								<div so-menu-item value="whatsapp" text="WhatsApp"></div>
							</ng-template>
						</div>
					</ng-template>
				</div>
				<div so-menu-popover-item value="due" text="Срок" lazyMount>
					<ng-template slot="default"><div so-calendar></div></ng-template>
				</div>
				<div so-menu-item value="archive" text="В архив" disabled></div>
				<div so-menu-separator></div>
				<div so-menu-item value="remove" text="Удалить" variant="negative">
					<span slot="trailing">Del</span>
				</div>
			</ng-template>
		</span>
	`,
})
export default class MenuPage {}
