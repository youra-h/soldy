/**
 * Фикстура темы: реестры значений оформления для тестов (корневой
 * `AGENTS.md`, «Оформление: значения объявляет тема»). Та же, что в
 * `packages/core/__tests__/theme.d.ts`.
 *
 * Имена условные и намеренно не совпадают с именами oren. Фикстура открывает
 * их всей программе типов — и шаблонам `src/components` тоже, потому что у
 * пакетного `tsconfig.json` нет `include`. С именами oren `view="plain"` в
 * разметке компонента прошёл бы «Типы — Angular»; с условными он не
 * компилируется, как и должно быть: значения темы разметка не передаёт.
 */
export {}

declare module '@soldy/core' {
	interface IComponentVariants {
		brand: true
		danger: true
	}

	interface IButtonViews {
		solid: true
		ghost: true
	}

	interface ITabsViews {
		pills: true
		cards: true
	}

	interface ICheckBoxViews {
		bare: true
		boxed: true
	}

	interface IRadioGroupViews {
		pip: true
		halo: true
	}

	interface ISkeletonShapes {
		square: true
		pill: true
	}

	interface ISkeletonAnimations {
		shimmer: true
		blink: true
	}
}
