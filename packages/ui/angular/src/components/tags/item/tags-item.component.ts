import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITagsItem, TTagsItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TagsItemInputNames, TTagsItemSurface } from './base.component'
import { setupTagsItem } from './setup.component'

/**
 * TTagsItemComponent — тег: корень, внутри строка — Button на `div` — и
 * кнопка закрытия рядом с ней, как у Vue.
 *
 * Селектор атрибутный, как у Button: `<div so-tags-item>`. Корень — сам
 * элемент потребителя, пилюля тега, а написанное на нём делится между корнем и
 * строкой, как у элемента ListBox. Корень несёт классы, `attrs`, `dataset` и
 * место в коллекции (`order`) — их раскладывает `TComponentBase` (стратегия
 * `'host'`): выбранный тег тема красит по `data-selected` корня, а вид набора —
 * пилюлю целиком, вместе с крестиком, — по классу набора над ним. Строке и
 * крестику вид не передаётся: части тега тема красит по контексту
 * (`.so-tags-item`).
 *
 * Строка несёт `aria` — роль по режиму набора (`listitem` без выбора,
 * `option` с выбором), `aria-selected` и `tabindex` от коллекции: с выбором
 * весь набор — одна остановка Tab, без выбора у строк `-1`. Кладёт её
 * директива набора поверх того, что кнопка пишет себе сама, — и роль, и
 * остановку кнопки на `div` набор тега перекрывает. Всё, что потребитель
 * записал на тег, кроме `class` и `style`, доходит до строки (`control`):
 * статику переносит база, привязки и слушатели — рендерер адаптера
 * (`provideAttrs()`). `direction` — явно: строка — свой узел, и направление
 * письма ей передаётся, а не только наследуется. Тег строки фиксирован
 * (`div`), а не берётся из `tag` элемента: `tag` — тег корня, под
 * фиксированный тег строки написан `TTagsItem._ariaTag`.
 *
 * Выбор — по `press` строки (`(soActionPress)`), а не по клику: строка —
 * `div`, фокус держит она сама, и клик из Enter и пробела на ней делает её
 * `TActionPlugin`. `press` не приходит на выключенный тег, а
 * `TSelectionExtension.toggle` выключенность не проверяет — на клик
 * выключенный тег выбирался бы.
 *
 * Кнопка закрытия — сосед строки, а не её часть: потомки опции для
 * скринридера презентационны, и подпись крестика приклеилась бы к названию
 * тега. Имя кнопке ядро собирает вместе с текстом тега (`closeAria`), в том же
 * наборе — `tabindex="-1"` с выбором. Рисуется она по итогу закрываемости
 * фасада (`tag_closable`) — `@if`, а не `rendered` кнопки, как у таба: скрытая
 * кнопка со своими плагинами стояла бы у каждого тега, — размер и `disabled` —
 * явно: от строки она их не наследует. Клик по ней не всплывает, как
 * `@click.stop` у Vue: корни тега и набора слушают клик (`TActionPlugin`), и
 * всплывший до них дал бы им `press`, а поле Select, в котором стоят теги,
 * открыло бы по нему панель.
 *
 * Слоты: `leading` и `trailing` проецируются, `default` (scope
 * `{ text, selected }`) — шаблоном или проекцией, без него — текст;
 * `close-icon` — шаблоном (`<ng-template slot="close-icon">`): по нему тег
 * решает, рисовать ли свою иконку крестика, а есть ли что-то в `<ng-content>`,
 * Angular не сообщает.
 *
 * `div[so-tags-item]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-tags-item], [so-tags-item]
 */
@Component({
	selector: 'div[so-tags-item], [so-tags-item]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tags-item.component.html',
})
export class TTagsItemComponent extends TTagsItemSurface<ITagsItem> {
	constructor() {
		super(TagsItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}

	protected createBinding(
		ctrl: ITagsItem | undefined,
		inputs: object,
	): TBinding<ITagsItem, TTagsItemCollectionFacade> {
		return setupTagsItem(ctrl, inputs)
	}

	/** `press` строки: выбор тега — переключить. Выключенному `press` не приходит. */
	protected toggle(): void {
		this.facade()?.context?.adapters.selection.toggle()
	}

	/** Клик по крестику: закрыть тег; клик не всплывает, как `@click.stop` у Vue. */
	protected close(event: Event): void {
		event.stopPropagation()
		this.facade()?.context?.adapters.tags.close()
	}
}
