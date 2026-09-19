/**
 * Значения оформления темы oren — ровно те, под которые у неё есть CSS.
 *
 * Библиотека своих значений `variant`, `view`, `shape` и `animation` не
 * объявляет: её реестры пусты, и тема дополняет их здесь (корневой
 * `AGENTS.md`, «Оформление: значения объявляет тема»). Подключи тему —
 * `import '@soldy/theme-oren'` — и пропсы компонентов примут эти имена, а
 * опечатку отклонит компилятор.
 *
 * Значение, которое совпадает с видом блока без модификатора (`normal`,
 * `filled` у Button, `outlined` у CheckBox, `line`, `dot`, `rounded`,
 * `pulse`), своего правила в CSS может не иметь, но объявлено всё равно: его
 * можно задать явно, и `normal` у Spinner — не база, а нейтраль.
 */
export {}

declare module '@soldy/core' {
	/** Смысловой цвет. Без варианта — нейтраль, у Spinner — `accent`. */
	interface IComponentVariants {
		normal: true
		accent: true
		positive: true
		negative: true
		caution: true
	}

	/** Вид кнопки и строк, которые рисует Button: ListBox, Accordion, Tags. */
	interface IButtonViews {
		filled: true
		plain: true
		outlined: true
		none: true
	}

	/** Вид табов. Без вида — `line`. */
	interface ITabsViews {
		line: true
		contained: true
		outline: true
	}

	/**
	 * Вид чекбокса. Без вида — `outlined`: коробка в рамке, отметка цветом
	 * варианта. `filled` — коробка залита, отмеченная — насыщенным цветом
	 * варианта. `plain` — без рамки и фона, для плотных списков.
	 */
	interface ICheckBoxViews {
		outlined: true
		filled: true
		plain: true
	}

	/**
	 * Вид радио — чем отмечен выбор. Без вида — `dot`: точка внутри тонкого
	 * кольца, как отметка внутри коробки чекбокса. `ring` — кольцо утолщается.
	 */
	interface IRadioGroupViews {
		dot: true
		ring: true
	}

	/** Форма заглушки. Без формы — `rounded`. */
	interface ISkeletonShapes {
		rect: true
		rounded: true
		circle: true
	}

	/** Анимация заглушки. Без анимации — `pulse`. */
	interface ISkeletonAnimations {
		pulse: true
		wave: true
		none: true
	}
}
