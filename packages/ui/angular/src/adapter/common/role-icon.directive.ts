import { Directive, ElementRef, computed, effect, inject, input } from '@angular/core'
import { getIcon } from '@soldy-ui/setup'

/**
 * RoleIconDirective — иконка по роли из реестра на `<svg>` Icon (аналог
 * `roleIcon` у Vue, React, Svelte и Solid).
 *
 * ```html
 * <svg so-icon so-role-icon="close" aria_label="Закрыть"></svg>
 * ```
 *
 * Иконка приходит данными (`{ viewBox, body }`, `useIcons`), а корень `<svg>`
 * пишет потребитель — это сам корень Icon. Директива кладёт на него только
 * рисунок: `viewBox` и содержимое. Класс, стиль размера, ARIA и связь с
 * `TElementPlugin` ведёт база Icon (`TComponentBase`), как у любого корня, —
 * директива о них не знает и их не трогает.
 *
 * Роль резолвится при отрисовке, а не при создании модуля: `useIcons()` может
 * прийти после импорта. Смена роли (`[so-role-icon]="role()"`) меняет рисунок
 * на том же узле.
 *
 * `viewBox` — привязка хоста. Содержимое — эффект, который разметку иконки
 * отдаёт на разбор самому документу (`insertAdjacentHTML`) внутри `<svg>`, и
 * документ разбирает её в пространстве имён SVG. Не привязка `[innerHTML]`:
 * DOM-эмуляция серверного рендера Angular (domino) запись `innerHTML` у
 * элементов SVG не реализует — запись бросала `NotYetImplemented`, и ошибка
 * обрывала отрисовку всего представления на сервере. `insertAdjacentHTML`
 * она разбирает, поэтому эффект рисует иконку и на сервере. Своего разбора
 * разметки на узлы нет: содержимое иконки произвольно, и разбирает его
 * документ, как `innerHTML` у Vue и Solid, `dangerouslySetInnerHTML` у React
 * и `{@html}` у Svelte. Санитайзера Angular здесь нет, как и у них: он вычищал
 * бы разметку SVG, а источник доверенный — пакет иконок из зависимостей
 * приложения, пользовательский ввод сюда не попадает.
 *
 * Содержимое `<svg>` — целиком за директивой: шаблон Icon пуст, и
 * написанное внутри элемента не выводится. Поэтому эффект сначала снимает
 * всё, что в узле, — и рисунок прошлой роли, и рисунок, который напечатал
 * сервер, — а потом ставит рисунок роли.
 *
 * Импортирует директиву потребитель вместе с Icon, как `SlotDirective`.
 *
 * Selector: svg[so-role-icon]
 */
@Directive({
	selector: 'svg[so-role-icon]',
	standalone: true,
	host: {
		'[attr.viewBox]': '_icon().viewBox',
	},
})
export class RoleIconDirective {
	/** Роль иконки — ключ реестра (`check`, `close`, …, своя роль приложения). */
	readonly role = input.required<string>({ alias: 'so-role-icon' })

	/** Иконка роли: заглушка, если роли нет в реестре (`getIcon` предупредит). */
	protected readonly _icon = computed(() => getIcon(this.role()))

	constructor() {
		const svg = inject<ElementRef<Element>>(ElementRef).nativeElement

		// Эффект, а не эффект после отрисовки: тот на сервере не выполняется
		effect(() => {
			const { body } = this._icon()

			svg.textContent = ''
			svg.insertAdjacentHTML('afterbegin', body)
		})
	}
}
