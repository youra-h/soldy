import { Directive, ElementRef, computed, effect, inject, input } from '@angular/core'
import { getIcon } from '@soldy-ui/setup'

/**
 * Иконка по роли из реестра на `<svg>` Icon, аналог `roleIcon` у Vue:
 * `<svg so-icon so-role-icon="close">`. Кладёт только рисунок — `viewBox` и
 * содержимое; корень ведёт база Icon. AGENTS.md (Angular), «Иконка по роли —
 * `RoleIconDirective`».
 */
@Directive({
	selector: 'svg[so-role-icon]',
	host: {
		'[attr.viewBox]': '_icon().viewBox',
	},
})
export class RoleIconDirective {
	readonly role = input.required<string>({ alias: 'so-role-icon' })

	protected readonly _icon = computed(() => getIcon(this.role()))

	constructor() {
		const svg = inject<ElementRef<Element>>(ElementRef).nativeElement

		// Эффект, а не после отрисовки: иконка нужна и разметке сервера.
		// `insertAdjacentHTML`, а не `innerHTML`: эмуляция DOM сервера (domino)
		// `innerHTML` у SVG не реализует
		effect(() => {
			const { body } = this._icon()

			svg.textContent = ''
			svg.insertAdjacentHTML('afterbegin', body)
		})
	}
}
