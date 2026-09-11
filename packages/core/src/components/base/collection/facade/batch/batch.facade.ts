import { TCollectionComponent } from '../collection-component.class'
import type { ICollectionComponentOptions, TCollectionFacadeProps } from '../types'
import type { IComponentProps, TComponentEvents } from '../../../component'
import type { IExtension } from '../../engine'
import type { TBatchExtension } from '../../engine'

/**
 * Фасад коллекции, у которой есть расширение `batch`: состав и `trackBy`.
 *
 * Это все коллекции без исключения, поэтому база самая нижняя.
 *
 * **Наследуется проекция, а не поведение.** Фасад ничего не делает сам — он
 * выставляет наружу то, что уже умеет расширение, чтобы дескриптор собирался
 * обычным `defineComponent`. Поведение по-прежнему в композиции расширений, и
 * прежняя беда коллекций на классическом наследовании здесь не повторяется:
 * иерархия фасадов повторяет **состав расширений**, а не таксономию
 * компонентов.
 *
 * Дженерик сужен до `{ batch }` намеренно. Во-первых, это делает нарушение
 * правила выше ошибкой компиляции: без расширения фасад не подключить.
 * Во-вторых, снимает приведения типов — раньше в фасадах List и Select стояло
 * `this.extensions.batch as unknown as TBatchExtension<TItem>`, потому что
 * широкий `Record<string, IExtension>` про `batch` ничего не знал, и проверка
 * в этом месте была просто выключена.
 *
 * Тип элемента у расширения при этом `any`, а не `TItem`. Расширения
 * инвариантны по элементу (методы и принимают его, и возвращают), поэтому
 * `TBatchExtension<IListBoxItem>` не подходит под `TBatchExtension<TItem>` даже
 * когда `TItem` — наследник, и цепочка фасадов переставала собираться.
 * Требование «расширение должно быть» от этого не слабеет — теряется только
 * сверка типа элемента, которой и раньше не было.
 */
export abstract class TBatchCollectionFacade<
	TItem extends object,
	TExtensions extends { batch: TBatchExtension<any> } & Record<string, IExtension<any>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TCollectionComponent<TItem, TExtensions, TEvents> {
	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.events.relay(this.extensions.batch.events, [
			'items:added',
			'items:removed',
			'change:trackBy',
		])
	}

	/**
	 * Раскладывает входные props по расширениям.
	 *
	 * Вызывается конкретным фасадом в конце конструктора, а не базой: наследник
	 * (`TSelectionCollectionFacade`) переопределяет метод, чтобы выставить
	 * `mode` **до** состава, и порядок должен быть виден в коде, а не зависеть
	 * от того, в каком порядке отработали конструкторы цепочки.
	 */
	protected applyProps(props: TCollectionFacadeProps<TItem>): void {
		if (props.items?.length) this.items = props.items
		if (props.trackBy) this.trackBy = props.trackBy
	}

	/**
	 * Не переключено на `driver.projection` (план задачи «Фильтрация у Select»
	 * это предполагал) — сделано и отменено в одном заходе.
	 *
	 * Причина: `<SelectItem v-for="item in items">` — это не только рендер, но
	 * и точка регистрации элемента в коллекции (`TCollectionItemExtension` →
	 * `plain.push()` на mount, `plain.remove()` на unmount через elevator —
	 * `packages/setup/adapter/extensions/collection/collection.extension.class.ts`).
	 * Стоило сузить `items` до проекции — Vue при сужении состава размонтирует
	 * скрытые `SelectItem`, а их cleanup безусловно вызывает `plain.remove()` —
	 * элемент по-настоящему удаляется из storage, хотя фильтр должен был лишь
	 * спрятать его. Подтверждено тестом (driver.length падал до 0 при активном
	 * фильтре в реальном Vue-рендере), см. отчёт разработчика в задаче.
	 *
	 * Сырой состав остаётся здесь. Слой проекции (`driver.projection`,
	 * `driver.canonical`, расширение `filter`) реализован и протестирован на
	 * уровне ядра — им может пользоваться код, не завязанный на mount/unmount
	 * (например, `TListNavigationPlugin`). Показать в DOM только видимые опции
	 * Select без потери элементов из storage — отдельная задача: она требует
	 * менять `Select.vue` так, чтобы `v-for` шёл по сырому составу, а скрытие
	 * шло через `v-show`/аналог на самой опции, не через исчезновение из списка.
	 */
	get items(): ReadonlyArray<TItem> {
		return this.extensions.batch.items
	}

	set items(value: any) {
		this.extensions.batch.update(value)
	}

	get trackBy(): ((item: TItem) => any) | undefined {
		return this.extensions.batch.trackBy
	}

	set trackBy(fn: ((item: TItem) => any) | undefined) {
		this.extensions.batch.trackBy = fn
	}
}
