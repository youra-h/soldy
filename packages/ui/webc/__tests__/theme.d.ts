/**
 * Фикстура темы: реестры значений оформления для тестов (корневой
 * `AGENTS.md`, «Оформление: значения объявляет тема»). Та же, что в
 * `packages/core/__tests__/theme.d.ts`.
 *
 * Имена условные и намеренно не совпадают с именами oren: фикстура открывает
 * их всей программе типов, и код `src` в той же программе на них не опирается
 * — значения темы разметка не передаёт.
 */
export {}

declare module '@soldy-ui/core' {
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
