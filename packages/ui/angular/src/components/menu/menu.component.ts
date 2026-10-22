import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator, type TBinding } from '../../adapter'
import { TFrameComponent } from '../frame'
import { TMenuItemComponent } from './item'
import { TMenuSubmenuComponent } from './submenu'
import { TMenuGroupComponent } from './group'
import { TMenuSeparatorComponent } from './separator'
import { MenuInputNames, TMenuSurface } from './base.component'
import { setupMenu } from './setup.component'

/**
 * TMenuComponent — меню действий у кнопки (APG Menu Button) или контекстное
 * меню области (`openOn="contextmenu"`).
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-menu>`), обёртка
 * триггера и якорь панели, как у Popover. Строчный тег по умолчанию — затем же,
 * что у Vue: меню встаёт и в строку текста, и в ряд кнопок. На корне — наборы
 * `attrs` и `dataset` (`data-open` — для потребителя, который красит свой
 * триггер по контексту); ARIA на корне нет — она у панели и у триггера.
 * Раскладывает их `TComponentBase` (стратегия `'host'`).
 *
 * Триггер — шаблон слота со scope (`<ng-template slot="trigger"
 * let-triggerAria="triggerAria" let-triggerDataset="triggerDataset">`): своего
 * экземпляра у содержимого слота нет, и связку с панелью (`aria-haspopup`,
 * `aria-expanded`, `id`, `aria-controls`) и вид «нажат» (`data-selected`) он
 * получает двумя наборами, а на свой элемент кладёт их директивой
 * `[so-attributes]`. Вывод шаблона отдаёт новый контекст тому же
 * представлению, поэтому триггер — тот же узел при каждом открытии и
 * закрытии, и фокус на нём остаётся. У контекстного меню в слоте — область
 * (строка, файл, картинка), и связка у неё пуста.
 *
 * Панель — Frame в шаблоне: телепорт, слой, привязка к корню, а у
 * контекстного меню — к точке вызова (`point`), пометка владельцем. Якорь —
 * корень, его узел шаблону отдаёт база (`rootElement()`). Открытость —
 * `visible` панели, а не `rendered`: пункты входят в коллекцию при монтировании,
 * и закрытие не должно её вычищать. Классы панели — свой набор меню
 * (`panelClasses`: блок `so-menu__panel` с размером и вариантом меню), привязкой
 * `[class]`: модификаторы корня до телепортированной панели не доходят, а
 * классы привязки Angular ставит по одному, и свои классы Frame база снимает
 * только свои.
 *
 * Контекстов два — свой и фасада коллекции (`setupMenu`), и входы фасада
 * (`items`, `engine`, `trackBy`, `groupBy`, `groups`) — входы того же
 * элемента. Свой слой лифта меню отдаёт поддереву провайдером
 * (`provideElevator()`): пункты разметки — его содержимое — и пункты из данных
 * в его шаблоне прочтут из слоя движок и регистратор этого меню.
 *
 * Пункты разметки — `<div so-menu-item>` и соседи в содержимом. Без них меню
 * рисует пункты из данных по секциям показанного (`sections`) — запасным
 * содержимым `<ng-content>`: группу с подписью — `<div so-menu-group>`, между
 * секциями — `<div so-menu-separator>`, пока его просит меню
 * (`groupSeparators`), пункт с вложенным `items` — подменю из данных
 * (`<div so-menu-submenu>` с записью `submenus`), остальные — действия.
 *
 * Слоты пунктов из данных — шаблоны (`item`, `item-*`), и подменю из данных
 * получает их под теми же именами. Его панель — шаблон `item-content` (scope
 * `{ item }`): меню отдаёт его подменю шаблоном `default`, а выводит —
 * `ngTemplateOutlet` с инжектором места (`ngTemplateOutletInjector="outlet"`),
 * и пункты, написанные в шаблоне, входят в коллекцию подменю, у которого он
 * выведен, а не меню, где его написали. Шаблон непрозрачен: заданный, он
 * заменяет пункты из данных у каждого подменю из данных.
 *
 * `span[so-menu]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: span[so-menu], [so-menu]
 */
@Component({
	selector: 'span[so-menu], [so-menu]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		SlotDirective,
		TFrameComponent,
		TMenuItemComponent,
		TMenuSubmenuComponent,
		TMenuGroupComponent,
		TMenuSeparatorComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu.component.html',
})
export class TMenuComponent extends TMenuSurface<IMenu> {
	constructor() {
		super(MenuInputNames, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	protected createBinding(
		ctrl: IMenu | undefined,
		inputs: object,
	): TBinding<IMenu, TMenuCollectionFacade> {
		return setupMenu(ctrl, inputs, this.engine)
	}
}
