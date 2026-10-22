import { Directive, signal, type Signal } from '@angular/core'

export const SUBTREE_PRESENT: Signal<boolean> = signal(true).asReadonly()

/**
 * Носитель признака «поддерево компонента есть» для потомков по DI: у Vue
 * `v-if` корня снимает и увезённые в `body` панели, а `display: none` Angular
 * до них не доходит. Host-директива базы — `providers` не наследуются.
 * Наружу — как `ɵSubtreeDirective` (NG3001). AGENTS.md (Angular), «Скрытый
 * компонент прячет и слои своего поддерева».
 */
@Directive({ standalone: true })
export class SubtreeDirective {
	private _present: Signal<boolean> = SUBTREE_PRESENT

	get present(): Signal<boolean> {
		return this._present
	}

	/** Зовёт база в конструкторе — раньше, чем Angular создаёт поддерево. */
	provide(present: Signal<boolean>): void {
		this._present = present
	}
}
