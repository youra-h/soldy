/**
 * Описание корня компонента — второй параметр конструктора базы. AGENTS.md
 * (Angular), «Корень-хост ведёт базовый `TComponentBase`» и следующие пункты.
 *
 * - `'host'` — корень — сам элемент потребителя (`<button so-button>`);
 * - `'view'` — корень в шаблоне (`#root`) или его нет (директива на
 *   `<ng-container>`: `so-virtual`);
 * - `'wrapped'` — элемент потребителя — обёртка, корень — `#root` в ней (окно
 *   таблицы); с `teleport` корень уезжает в слой, а обёртка без коробки
 *   остаётся местом (регион тостов).
 */
export type TRootSpec =
	| { readonly strategy: 'view' }
	| { readonly strategy: 'wrapped'; readonly teleport?: TRootTeleport }
	| {
			readonly strategy: 'host'
			/** Выход со стилем, который считает ядро (`fractionStyle` у ProgressSpinner). */
			readonly style?: string
			/** Прячут ли `visible` и `rendered` корень; нет у Skeleton. По умолчанию да. */
			readonly hides?: boolean
			/** Свойство стиля под место в коллекции: CSS `order`, `--so-toasts-depth`. */
			readonly order?: string
			/** Выход, без которого корня нет, как `v-if` (`active` панели таба). */
			readonly shownBy?: string
			readonly teleport?: TRootTeleport
			/** Наборы ядра на корне; у поля `aria` стоит на `<input>`. По умолчанию все три. */
			readonly sets?: readonly TRootSet[]
			/** Выход слоя `aria` корня (`rootAria` у Slider). По умолчанию `aria`. */
			readonly aria?: string
			/** Выходы плагинов на корне (`dismiss_ownerAttribute`), поверх наборов ядра. */
			readonly plugins?: readonly string[]
			/** Написанное потребителем, кроме класса и стиля, — узлу `#control`. */
			readonly control?: boolean
			/** Выход, который ложится атрибутом `id` корня, под набором `attrs`. */
			readonly id?: string
	  }

export type TRootSet = 'attrs' | 'aria' | 'dataset'

export type TRootStrategy = TRootSpec['strategy']

/** Слой: имена выходов цели и «на месте» и спутник (`#companion` — подложка). */
export type TRootTeleport = {
	readonly target: string
	/** Нет — у слоя нет места на месте (окно, регион тостов). */
	readonly contained?: string
	readonly companion?: boolean
}

export type TRootHost = Extract<TRootSpec, { readonly strategy: 'host' }>

/** Что база раскладывает на корень. Корень внутри обёртки берёт умолчания. */
export type TRootPaint = Pick<TRootHost, 'style' | 'order' | 'sets' | 'aria' | 'plugins' | 'id'>
