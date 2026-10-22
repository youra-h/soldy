import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ISkeleton } from '@soldy-ui/core'
import { TSkeletonSurface } from '../../generated/skeleton.metadata'
import { setupSkeleton } from './setup.component'

/**
 * TSkeletonComponent — заглушка поверх будущего содержимого.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<div so-skeleton>`), а
 * шаблон — заглушка и содержимое элемента. Корень есть всегда: в нём лежит
 * содержимое, а `rendered` и `visible` решают только, показана ли заглушка
 * (`present`). Поэтому база видимостью корень не прячет (`hides: false`):
 * `display: none` спрятал бы и содержимое. Классы, наборы и размер
 * (`layout_styles`) раскладывает на элемент `TComponentBase` (стратегия
 * `'host'`); пока заглушка показана, ядро помечает корень `aria-busy`.
 *
 * Селектор — один атрибут, без тега: создаёт компонент сам
 * (`createComponent`) — Angular берёт `div`, умолчание ядра.
 *
 * Selector: [so-skeleton]
 */
@Component({
	selector: '[so-skeleton]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './skeleton.component.html',
})
export class TSkeletonComponent extends TSkeletonSurface<ISkeleton> {
	constructor() {
		super(setupSkeleton, { strategy: 'host', hides: false })
	}
}
