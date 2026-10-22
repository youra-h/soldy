import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITags } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TTagsItemComponent } from './item'
import { TTagsSurface } from '../../generated/tags.metadata'
import { setupTags } from './setup.component'

/**
 * TTagsComponent — набор тегов: ряд, в нём теги.
 *
 * Селектор атрибутный, как у Button: `<div so-tags>`. Корень — сам элемент
 * потребителя, и всё, что на нём написано, относится к нему: ряд с ролью и
 * есть набор, как у Vue, где атрибуты потребителя лежат на корне рядом с
 * наборами. Классы, все три набора ядра и скрытие раскладывает на него
 * `TComponentBase` (стратегия `'host'`): роль ряда (`list` без выбора,
 * `listbox` с выбором, `aria-orientation`, `aria-multiselectable`) пишет
 * коллекция в `aria`, режим переполнения уезжает в тему через
 * `data-overflow` (`dataset`), и раскладка ряда — перенос, прокрутка — целиком
 * её дело.
 *
 * Контекстов два — свой и фасада коллекции (`setupTags`), и входы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — входы того же элемента. Свой слой
 * лифта набор отдаёт поддереву провайдером (`provideElevator()`): теги
 * разметки — его содержимое — и теги из данных в его шаблоне прочтут из слоя
 * движок и регистратор этого набора.
 *
 * Теги — содержимое (`<div so-tags-item>`), а без него — показанные теги
 * коллекции (`shown`) запасным содержимым `<ng-content>`, ключ — `uid` тега.
 * Шаблон слота `default` получает показанные теги в scope
 * (`<ng-template slot="default" let-shown="shown">`) и заменяет и то и другое:
 * своя разметка раскладывает их, как ей нужно, — в ленту `Scroller`, в ряд с
 * хвостом в `Popover`, — и каждый тег рисуется в ней ровно один раз: вторая
 * отрисовка перетёрла бы его запись в реестре bundles.
 *
 * `div[so-tags]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-tags], [so-tags]
 */
@Component({
	selector: 'div[so-tags], [so-tags]',
	imports: [NgTemplateOutlet, SlotDirective, TTagsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tags.component.html',
})
export class TTagsComponent extends TTagsSurface<ITags> {
	constructor() {
		super((ctrl, inputs) => setupTags(ctrl, inputs, this.engine), { strategy: 'host' })
	}
}
