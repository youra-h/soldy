import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IComponentView } from '@soldy-ui/core'
import { TComponentViewSurface } from '../../generated/component-view.metadata'
import { setupComponentView } from './setup.component'

/**
 * TComponentViewComponent — слой TComponentView с DOM-биндингом.
 *
 * Входы и выходы с их типами объявляет сгенерированная база
 * `TComponentViewSurface` (generated/component-view.metadata.ts), в
 * `@Component` их нет — как у Button.
 *
 * Корень — сам элемент потребителя, как у Button: `<section so-component-view>`.
 * Тег ядро получает от элемента, классы, скрытие и наборы ядра раскладывает на
 * него `TComponentBase` со стратегией `'host'`. Селектор — один атрибут, без
 * тега: создаёт компонент сам (`createComponent`) — Angular берёт `div`,
 * умолчание ядра.
 *
 * Selector: [so-component-view]
 */
@Component({
	selector: '[so-component-view]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentViewComponent extends TComponentViewSurface<IComponentView> {
	constructor() {
		super(setupComponentView, { strategy: 'host' })
	}
}
