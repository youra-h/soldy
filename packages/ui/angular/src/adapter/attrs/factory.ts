/**
 * Фабрика рендереров адаптера — наследник фабрики рендереров DOM Angular
 * (`ɵDomRendererFactory2`): каждый рендерер, который она отдаёт, обёрнут
 * рендерером адаптера (`TForwardingRenderer`).
 *
 * Подменяется именно `ɵDomRendererFactory2`, а не `RendererFactory2`:
 * `RendererFactory2` подменяют и старые анимации Angular
 * (`provideAnimationsAsync`, `provideAnimations`), и из двух подмен действовала
 * бы одна. Свою фабрику анимации строят поверх `ɵDomRendererFactory2`, поэтому
 * рендерер адаптера стоит под ними при любом порядке провайдеров. Сервер
 * (`@angular/platform-server`) рисует тем же `ɵDomRendererFactory2`. Это
 * закрытое API Angular: перестала подмена работать — падают спеки
 * `attrs.spec.ts`, а запасной путь — подменять `RendererFactory2`, когда
 * старых анимаций не станет.
 *
 * Своего конструктора нет: фабрику DI наследник получает от родителя, а
 * зависимости его конструктора у Angular 21 и 22 разные. Реестр — `inject` в
 * поле: поля инициализирует тот же вызов фабрики DI.
 *
 * Рендерер Angular создаётся на каждый тип компонента и кешируется, а
 * `createRenderer` зовётся на каждый экземпляр, — поэтому обёртка одна на
 * рендерер Angular.
 */

import {
	ANIMATION_MODULE_TYPE,
	Injectable,
	inject,
	type Renderer2,
	type RendererType2,
} from '@angular/core'
import { ɵDomRendererFactory2 } from '@angular/platform-browser'
import { TForwardRegistry } from './registry'
import { TForwardingRenderer } from './renderer'

/**
 * Снять с рендерера Angular проверку синтетических свойств (`[@x]`) — так,
 * как её снимает фабрика старых анимаций Angular 21: по полю, а не по классу.
 */
function allowSyntheticProps(renderer: Renderer2): void {
	if ('throwOnSyntheticProps' in renderer) renderer.throwOnSyntheticProps = false
}

@Injectable()
export class TForwardingRendererFactory extends ɵDomRendererFactory2 {
	private readonly _registry = inject(TForwardRegistry).serve()

	/**
	 * В приложении подключены старые анимации Angular. Их отложенная фабрика
	 * (`provideAnimationsAsync`) до загрузки модуля анимаций отдаёт синтетические
	 * свойства (`[@x]`) нашему рендереру, а проверку таких свойств снимает с
	 * рендерера, который получила, — только если узнала в нём рендерер Angular.
	 * Наш она не узнаёт, и рендерер Angular под ним бросил бы ошибку режима
	 * разработки на первой же отрисовке анимированного компонента. Поэтому при
	 * анимациях проверку снимает сама фабрика адаптера. Цена — у
	 * `provideAnimations()` синтетическое свойство компонента без `animations`
	 * в декораторе не анимируется молча, без этой ошибки.
	 */
	private readonly _animated = inject(ANIMATION_MODULE_TYPE, { optional: true }) !== null

	/** Обёртка — одна на рендерер Angular. */
	private readonly _renderers = new WeakMap<Renderer2, TForwardingRenderer>()

	override createRenderer(element: unknown, type: RendererType2 | null): Renderer2 {
		const delegate = super.createRenderer(element, type)
		const known = this._renderers.get(delegate)

		if (known) return known

		if (this._animated) allowSyntheticProps(delegate)

		const renderer = new TForwardingRenderer(delegate, this._registry)

		this._renderers.set(delegate, renderer)

		return renderer
	}
}
