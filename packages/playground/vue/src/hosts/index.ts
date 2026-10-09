import { watch } from 'vue'
import { isPreviewHostModule, type IPreviewHost } from '@soldy-ui/playground-shared'
import { locale } from '../composables/useLanguage'

/** Фреймворк стенда. */
export type TFramework = {
	/** Первый сегмент адреса (`/react/button`) и папка хоста (`hosts/react/`). */
	readonly id: string
	/** Подпись в шапке и на страницах. */
	readonly label: string
}

/**
 * Фреймворки стенда — в порядке списка в шапке.
 *
 * Хост фреймворка — папка рядом (`hosts/<id>/`) с модулем `index.ts`, чей
 * экспорт по умолчанию — хост превью (`IPreviewHost` в `@soldy-ui/playground-shared`).
 * Строка здесь, папка там: `__tests__/navigation.spec.ts` сверяет, что они не
 * разошлись.
 */
export const FRAMEWORKS: readonly TFramework[] = [
	{ id: 'vue', label: 'Vue' },
	{ id: 'react', label: 'React' },
]

/** Фреймворк, на котором стенд открывается. */
export const DEFAULT_FRAMEWORK = 'vue'

/**
 * Модули хостов — лениво, по папкам: хост грузится, когда фреймворк выбрали.
 *
 * Glob, а не `import('./react')`: прямой импорт втянул бы `.tsx` хоста в
 * программу vue-tsc оболочки, а у хоста своя программа типов (свой
 * `tsconfig.json`) и свой плагин Vite по папке. Оболочка знает хост только
 * через контракт, и форму модуля проверяет сторож, а не приведение.
 */
const MODULES = import.meta.glob('./*/index.ts')

const hosts = new Map<string, IPreviewHost>()
const loading = new Map<string, Promise<IPreviewHost>>()

export function isFramework(value: unknown): value is string {
	return FRAMEWORKS.some((framework) => framework.id === value)
}

/** Подпись фреймворка; неизвестный — его же идентификатор. */
export function frameworkLabel(id: string): string {
	return FRAMEWORKS.find((framework) => framework.id === id)?.label ?? id
}

async function importHost(framework: string): Promise<IPreviewHost> {
	const load = MODULES[`./${framework}/index.ts`]

	if (!isFramework(framework) || !load) {
		throw new Error(`[playground] у стенда нет хоста «${framework}»`)
	}

	const module = await load()

	if (!isPreviewHostModule(module)) {
		throw new Error(
			`[playground] hosts/${framework}/index.ts отдаёт по умолчанию не хост превью`,
		)
	}

	// Язык шапки — сразу, до первого монтирования: корни хоста рисуются уже
	// на нём
	module.default.setLocale(locale.value)
	hosts.set(framework, module.default)

	return module.default
}

/**
 * Хост фреймворка — загруженный однажды. Грузит его роутер, до входа на
 * страницу фреймворка: страницы получают хост готовым (`hostOf`).
 */
export async function loadHost(framework: string): Promise<IPreviewHost> {
	const loaded = hosts.get(framework)

	if (loaded) return loaded

	let pending = loading.get(framework)

	if (!pending) {
		pending = importHost(framework).finally(() => loading.delete(framework))
		loading.set(framework, pending)
	}

	return pending
}

/** Загруженный хост. Не загружен — ошибка: страница открыта мимо роутера. */
export function hostOf(framework: string): IPreviewHost {
	const host = hosts.get(framework)

	if (!host) {
		throw new Error(
			`[playground] хост «${framework}» не загружен: его грузит роутер до входа на страницу (loadHost)`,
		)
	}

	return host
}

// Смена языка в шапке — всем загруженным хостам, без перемонтирования
watch(locale, (next) => {
	for (const host of hosts.values()) host.setLocale(next)
})
