import {
	COMPONENTS,
	SCENARIOS as SCENARIO_REGISTRY,
	TOPICS as TOPIC_REGISTRY,
	type TComponentEntry,
	type TScenario,
	type TTopic,
} from '@soldy/playground-shared'
import { PREVIEW_COMPONENTS } from './previews'
import { fixtureOf } from './scenarios/fixtures'

/**
 * Что этот адаптер умеет показать.
 *
 * Реестр в `@soldy/playground-shared` — каталог **библиотеки**, он одинаков для
 * всех шести стендов. Но адаптеры дорастают до него по очереди: компоненты
 * сначала пишутся на Vue, обкатываются, и только потом переносятся дальше — в
 * React сейчас два компонента из двадцати.
 *
 * Поэтому меню и витрина показывают пересечение каталога с картой превью. Чего
 * адаптер не реализовал — того в меню нет, вместо восемнадцати пунктов, ведущих
 * в пустоту. Обратное тоже верно: появился компонент в `previews` — страница
 * возникает сама, править список не нужно.
 */
export const AVAILABLE = COMPONENTS.filter((entry) => entry.id in PREVIEW_COMPONENTS)

/**
 * По алфавиту, а не в порядке реестра.
 *
 * В реестре порядок исторический — как добавляли. Пока пунктов было пять, это
 * не мешало; на двадцати искать глазами нужный стало дольше, чем открыть его.
 * Стенд — инструмент поиска, а не витрина хронологии.
 */
const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)

/** Готовые компоненты — они и попадают на витрину. */
export const SHOWCASE = AVAILABLE.filter((entry) => entry.showcase).sort(byLabel)

/** Слои наследования: страница есть, на витрине им делать нечего. */
export const LAYERS = AVAILABLE.filter((entry) => !entry.showcase).sort(byLabel)

export function findAvailable(id: string) {
	return AVAILABLE.find((entry) => entry.id === id)
}

/**
 * Сценарии страницы тестов, которые этот адаптер может нарисовать.
 *
 * То же пересечение, что у меню: реестр сценариев — каталог всей библиотеки,
 * а показывается только то, для чего у адаптера есть и компонент, и
 * фикстура. React с двумя компонентами покажет их сценарии, а не пустые блоки.
 */
export const SCENARIOS = SCENARIO_REGISTRY.filter(
	(scenario) => findAvailable(scenario.component) && fixtureOf(scenario),
)

/** Темы, в которых есть что запустить, — в порядке меню. */
export function topicsOf(scenarios: readonly TScenario[]): readonly TTopic[] {
	return TOPIC_REGISTRY.filter((topic) =>
		scenarios.some((scenario) => scenario.topic === topic.id),
	)
}

export const TOPICS = topicsOf(SCENARIOS)

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
	return AVAILABLE.filter((entry) =>
		scenarios.some((scenario) => scenario.topic === topic && scenario.component === entry.id),
	).sort(byLabel)
}

/**
 * Адрес страницы тестов. Компонент сохраняется при смене темы, если в новой
 * теме у него есть сценарии, — иначе первый по алфавиту. Нет ни одной темы
 * со сценариями — `undefined`.
 */
export function testsPath(
	scenarios: readonly TScenario[],
	topic: string | undefined = topicsOf(scenarios)[0]?.id,
	component?: string,
): string | undefined {
	if (!topic) return undefined

	const components = componentsOf(scenarios, topic)
	const target = components.find((entry) => entry.id === component) ?? components[0]

	return target ? `/tests/${topic}/${target.id}` : undefined
}
