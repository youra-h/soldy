import { Directive, computed, inject, input } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'
import { getIcon } from '@soldy-ui/setup'

/**
 * RoleIconDirective — иконка по роли из реестра на `<svg>` Icon (аналог
 * `useIcon` у Vue и `roleIcon` у React, Svelte и Solid).
 *
 * ```html
 * <svg so-icon so-role-icon="close" aria_label="Закрыть"></svg>
 * ```
 *
 * Иконка приходит данными (`{ viewBox, body }`, `setIcons`), а корень `<svg>`
 * пишет потребитель — это сам корень Icon. Директива кладёт на него только
 * рисунок: `viewBox` и содержимое. Класс, стиль размера, ARIA и связь с
 * `TElementPlugin` ведёт база Icon (`TComponentBase`), как у любого корня, —
 * директива о них не знает и их не трогает.
 *
 * Роль резолвится при отрисовке, а не при создании модуля: `setIcons()` может
 * прийти после импорта. Смена роли (`[so-role-icon]="role()"`) меняет рисунок
 * на том же узле.
 *
 * Содержимое ставится мимо санитайзера (`bypassSecurityTrustHtml`): санитайзер
 * Angular вычищает разметку SVG, а источник доверенный — пакет иконок из
 * зависимостей приложения, пользовательский ввод сюда не попадает; так же
 * `dangerouslySetInnerHTML` у React. Узел — `<svg>`, и разметку иконки
 * документ разбирает в пространстве имён SVG. Содержимое и `viewBox` —
 * привязки хоста, а не запись в узел: их рисует и серверный рендер.
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
		'[innerHTML]': '_body()',
	},
})
export class RoleIconDirective {
	/** Роль иконки — ключ реестра (`check`, `close`, …, своя роль приложения). */
	readonly role = input.required<string>({ alias: 'so-role-icon' })

	private readonly _sanitizer = inject(DomSanitizer)

	/** Иконка роли: заглушка, если роли нет в реестре (`getIcon` предупредит). */
	protected readonly _icon = computed(() => getIcon(this.role()))

	/** Содержимое `<svg>` — доверенная разметка иконки. */
	protected readonly _body = computed(
		(): SafeHtml => this._sanitizer.bypassSecurityTrustHtml(this._icon().body),
	)
}
