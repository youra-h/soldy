import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IItemGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TMenuGroupSurface } from '../../../generated/menu-group.metadata'
import { setupMenuGroup } from './setup.component'

/**
 * TMenuGroupComponent — пункты меню под общей подписью, как `Menu.Group` у Vue.
 *
 * Корень — сам элемент потребителя, как у Button: `<div so-menu-group>`. Всё,
 * что потребитель пишет на элемент, относится к группе, поэтому классы, скрытие
 * и три набора ядра — `role="group"` и `aria-labelledby` на подпись —
 * раскладывает на него `TComponentBase` (стратегия `'host'`). Первым — селектор
 * с тегом умолчания ядра: по нему Angular выбирает тег хоста, когда создаёт
 * компонент сам.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id`: подпись — разметка
 * без своего экземпляра. Пункты — проекция: в коллекцию меню они входят сквозь
 * группу, из слоя лифта меню, и навигация ходит по ним, как по одному списку.
 *
 * Свой слой лифта группа отдаёт поддереву провайдером (`provideElevator()`): в
 * него проводка группы опускает её ключ, и пункты в содержимом входят в её
 * секцию группировки. DI идёт по дереву объявлений, поэтому ключ видит пункт,
 * которого потребитель написал внутри группы, и пункт из данных, которого меню
 * рисует в группе секции.
 *
 * Selector: div[so-menu-group], [so-menu-group]
 */
@Component({
	selector: 'div[so-menu-group], [so-menu-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-group.component.html',
})
export class TMenuGroupComponent extends TMenuGroupSurface<IItemGroup> {
	constructor() {
		super(setupMenuGroup, { strategy: 'host' })
	}
}
