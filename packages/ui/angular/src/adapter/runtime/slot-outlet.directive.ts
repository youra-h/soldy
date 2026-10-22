import {
	Directive,
	Injector,
	Input,
	ViewContainerRef,
	inject,
	type EmbeddedViewRef,
	type OnChanges,
	type SimpleChanges,
	type TemplateRef,
} from '@angular/core'

/**
 * SlotOutletDirective — шаблон слота, выведенный так, будто его написали там,
 * где он рисуется: компоненты в нём видят DI места вывода, а не места
 * объявления, как слот у Vue, React и Solid (`ResolvedSlot`).
 *
 * ```html
 * <ng-container [so-slot-outlet]="content" [so-slot-outlet-context]="{ item }" />
 * ```
 *
 * Встроенное представление Angular ищет DI по дереву объявлений: пункт меню из
 * шаблона `item-content`, написанного в `<span so-menu>`, прочёл бы слой лифта
 * меню и вошёл бы в коллекцию меню, хотя рисует его подменю. Поэтому директива
 * создаёт представление в своём `ViewContainerRef` с инжектором места
 * (`createEmbeddedView(template, context, { injector })`), а инжектор — её
 * собственный, инжектор узла, где она стоит. Такое представление Angular
 * спрашивает сначала по своим узлам, потом инжектор места, и только если тот
 * ничего не нашёл, — по дереву объявлений. Владелец внутри шаблона — группа,
 * группа переключателей — остаётся своим пунктам ближе места: его узел
 * представления спрашивают раньше. Слой лифта читается со `skipSelf`, а он в
 * этом обходе действует только на первом узле — так с Angular 22.1.6; раньше
 * `skipSelf` пропускал все узлы представления, и пункт владельца из того же
 * шаблона не видел.
 *
 * Не `ngTemplateOutletInjector`: инжектор места шаблон компонента назвать не
 * может — `inject` в компонентах запрещён, — а значение `'outlet'` (инжектор
 * самого вывода, то же, что здесь) появилось только в Angular 21.2, пакет же
 * работает и с 21.1.
 *
 * Представление пересоздаётся только с новым шаблоном. Новый контекст уходит
 * тому же представлению, как у `ngTemplateOutlet`: контекст представления —
 * переадресация на текущий контекст входа, и узлы шаблона, с фокусом и
 * состоянием в них, остаются теми же. Подменить контекст у готового
 * представления нельзя: запись `context` Angular объявил устаревшей и
 * предупреждает о ней в режиме разработки.
 *
 * Механизм фреймворка — в адаптерном слое: директиву ставит разметка
 * компонента, как `[so-attributes]`.
 *
 * Selector: [so-slot-outlet]
 */
@Directive({
	selector: '[so-slot-outlet]',
	standalone: true,
})
export class SlotOutletDirective implements OnChanges {
	/** Шаблон слота: новый — новое представление, `null` — ничего. */
	@Input({ alias: 'so-slot-outlet', required: true })
	template: TemplateRef<unknown> | null = null

	/** Контекст шаблона — scope слота; новый уходит тому же представлению. */
	@Input('so-slot-outlet-context')
	context: object | null = null

	private readonly _container = inject(ViewContainerRef)

	/** Инжектор узла директивы — инжектор места вывода. */
	private readonly _place = inject(Injector)

	/** Представление шаблона; нет шаблона — `null`. */
	private _view: EmbeddedViewRef<unknown> | null = null

	/**
	 * Контекст представления — один на директиву: читает текущий контекст
	 * входа, поэтому новый контекст представление видит без пересоздания.
	 */
	private readonly _scope = new Proxy<object>(
		{},
		{ get: (_target, key) => (this.context ? Reflect.get(this.context, key) : undefined) },
	)

	ngOnChanges(changes: SimpleChanges): void {
		if (!changes['template']) return

		if (this._view) this._container.remove(this._container.indexOf(this._view))

		this._view = this.template
			? this._container.createEmbeddedView(this.template, this._scope, {
					injector: this._place,
				})
			: null
	}
}
