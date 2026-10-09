import {
	COMPONENTS,
	SCENARIOS as SCENARIO_REGISTRY,
	TOPICS as TOPIC_REGISTRY,
	type IPreviewHost,
	type TComponentEntry,
	type TScenario,
	type TTopic,
} from '@soldy-ui/playground-shared'

/**
 * Что хост фреймворка умеет показать.
 *
 * Реестр в `@soldy-ui/playground-shared` — каталог **библиотеки**, он одинаков
 * для всех фреймворков. Но адаптеры дорастают до него по очереди: компоненты
 * сначала пишутся на Vue, обкатываются, и только потом переносятся дальше — у
 * React их пока тринадцать.
 *
 * Поэтому меню и витрина показывают пересечение каталога с картой превью
 * хоста. Чего хост не умеет — того в меню нет, вместо пунктов, ведущих в
 * пустоту. Обратное тоже верно: появился компонент в превью хоста — страница
 * возникает сама, править список не нужно.
 */
export function availableOf(host: IPreviewHost): readonly TComponentEntry[] {
	return COMPONENTS.filter((entry) => host.previews.includes(entry.id))
}

/**
 * По алфавиту, а не в порядке реестра.
 *
 * В реестре порядок исторический — как добавляли. Пока пунктов было пять, это
 * не мешало; на двадцати искать глазами нужный стало дольше, чем открыть его.
 * Стенд — инструмент поиска, а не витрина хронологии.
 */
const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)

/** Готовые компоненты — они и попадают на витрину. */
export function showcaseOf(host: IPreviewHost): readonly TComponentEntry[] {
	return availableOf(host)
		.filter((entry) => entry.showcase)
		.sort(byLabel)
}

/** Слои наследования: страница есть, на витрине им делать нечего. */
export function layersOf(host: IPreviewHost): readonly TComponentEntry[] {
	return availableOf(host)
		.filter((entry) => !entry.showcase)
		.sort(byLabel)
}

export function findAvailable(host: IPreviewHost, id: string): TComponentEntry | undefined {
	return availableOf(host).find((entry) => entry.id === id)
}

/** Может ли хост нарисовать сценарий: фикстура по ключу, без ключа — превью. */
function drawable(host: IPreviewHost, scenario: TScenario): boolean {
	return scenario.fixture === undefined
		? host.previews.includes(scenario.component)
		: host.fixtures.includes(scenario.fixture)
}

/**
 * Сценарии страницы тестов, которые хост может нарисовать.
 *
 * То же пересечение, что у меню: реестр сценариев — каталог всей библиотеки,
 * а показывается только то, для чего у хоста есть и компонент, и фикстура.
 * Хост без ProgressLinear покажет сценарии кольца, а не пустые блоки линии.
 */
export function scenariosOf(host: IPreviewHost): readonly TScenario[] {
	return SCENARIO_REGISTRY.filter(
		(scenario) => findAvailable(host, scenario.component) && drawable(host, scenario),
	)
}

/** Темы, в которых есть что запустить, — в порядке меню. */
export function topicsOf(scenarios: readonly TScenario[]): readonly TTopic[] {
	return TOPIC_REGISTRY.filter((topic) =>
		scenarios.some((scenario) => scenario.topic === topic.id),
	)
}

/**
 * Компоненты, у которых в теме есть сценарии, — по алфавиту, как меню
 * страницы свойств. Каждый — своя страница: сценариев у компонента десятки,
 * и все компоненты темы на одной странице искать глазами было бы дольше, чем
 * открыть нужный.
 */
export function componentsOf(
	scenarios: readonly TScenario[],
	topic: string,
): readonly TComponentEntry[] {
	return COMPONENTS.filter((entry) =>
		scenarios.some((scenario) => scenario.topic === topic && scenario.component === entry.id),
	).sort(byLabel)
}

/**
 * Адрес страницы тестов фреймворка. Компонент сохраняется при смене темы,
 * если в новой теме у него есть сценарии, — иначе первый по алфавиту. Нет ни
 * одной темы со сценариями — `undefined`.
 */
export function testsPath(
	framework: string,
	scenarios: readonly TScenario[],
	topic: string | undefined = topicsOf(scenarios)[0]?.id,
	component?: string,
): string | undefined {
	if (!topic) return undefined

	const components = componentsOf(scenarios, topic)
	const target = components.find((entry) => entry.id === component) ?? components[0]

	return target ? `/${framework}/tests/${topic}/${target.id}` : undefined
}
