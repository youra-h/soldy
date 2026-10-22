import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IItemGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TSelectGroupSurface } from '../../../generated/select-group.metadata'
import { setupSelectGroup } from './setup.component'

/**
 * TSelectGroupComponent — опции Select под общей подписью, как `Select.Group`
 * у Vue.
 *
 * Корень — сам элемент потребителя, как у Button: `<div so-select-group>`.
 * Всё, что потребитель пишет на элемент, относится к группе, поэтому селектор
 * атрибутный, а классы, скрытие и три набора ядра — `role="group"` и
 * `aria-labelledby` на подпись — раскладывает на него `TComponentBase`
 * (стратегия `'host'`). Первым — селектор с тегом умолчания ядра: по нему
 * Angular выбирает тег хоста, когда создаёт компонент сам.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
 * `presentation`: список панели — `listbox`, а в нём ARIA пускает только
 * опции и группы. Опции — проекция: в коллекцию Select они входят сквозь
 * группу, из слоя лифта Select, и подсветка стрелками ходит по ним, как по
 * одному списку.
 *
 * Свой слой лифта группа отдаёт поддереву провайдером (`provideElevator()`):
 * в него проводка группы опускает её ключ, и опции в содержимом входят в её
 * группу. DI идёт по дереву объявлений, поэтому ключ видит опция, которую
 * потребитель написал внутри группы.
 *
 * Selector: div[so-select-group], [so-select-group]
 */
@Component({
	selector: 'div[so-select-group], [so-select-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './select-group.component.html',
})
export class TSelectGroupComponent extends TSelectGroupSurface<IItemGroup> {
	constructor() {
		super(setupSelectGroup, { strategy: 'host' })
	}
}
