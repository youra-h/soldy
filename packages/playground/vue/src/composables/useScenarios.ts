import {
	computed,
	inject,
	shallowReactive,
	shallowRef,
	type ComputedRef,
	type InjectionKey,
	type ShallowRef,
} from 'vue'
import {
	TScenarioHost,
	TScenarioRunner,
	type IPreviewHost,
	type TScenario,
	type TScenarioState,
	type TSceneNodes,
	type TTopic,
} from '@soldy-ui/playground-shared'
import { scenariosOf, topicsOf } from '../catalog'
import { hostOf } from '../hosts'

/**
 * Страница тестов фреймворка в сборе: сценарии, раннер и хост сценариев.
 *
 * Реактивность — только здесь, в обёртке: раннер и хост сценариев общие для
 * всех фреймворков и о Vue не знают. Шаблоны читают снимок состояний, который
 * обновляется по подписке на раннер.
 */
export type TScenarioBench = {
	readonly scenarios: readonly TScenario[]
	readonly topics: readonly TTopic[]
	readonly runner: TScenarioRunner
	/** Состояния сценариев — новым объектом на каждое изменение. */
	readonly states: Readonly<ShallowRef<Readonly<Record<string, TScenarioState>>>>
	/** Сценарии, у которых на сцене компонент. Реактивно: без него — заглушка. */
	readonly staged: ReadonlySet<string>
	/** Блок отдаёт свои узлы: сцену — сценарию, узел монтирования — хосту. */
	attach(id: string, nodes: TSceneNodes): void
	detach(id: string, scene: HTMLElement): void
}

/**
 * Стенд сценариев на хосте превью фреймворка.
 *
 * Монтирует хост сценариев (`TScenarioHost`): компонент сценария рисует хост
 * превью — в узел сцены блока, а события пишет в журнал прогона.
 */
export function createScenarioBench(
	host: IPreviewHost,
	scenarios: readonly TScenario[],
	options: { timeout?: number } = {},
): TScenarioBench {
	const staged = shallowReactive(new Set<string>())
	const scenes = new TScenarioHost(host, {
		onStage: (id, on) => {
			if (on) staged.add(id)
			else staged.delete(id)
		},
	})
	const runner = new TScenarioRunner({ host: scenes, scenarios, timeout: options.timeout })
	const states = shallowRef(runner.snapshot())

	runner.subscribe(() => {
		states.value = runner.snapshot()
	})

	return {
		scenarios,
		topics: topicsOf(scenarios),
		runner,
		states,
		staged,
		attach: (id, nodes) => scenes.attach(id, nodes),
		detach: (id, scene) => scenes.detach(id, scene),
	}
}

/** Ключ, которым тест подкладывает странице свой стенд сценариев. */
export const SCENARIO_BENCH: InjectionKey<TScenarioBench> = Symbol('scenario-bench')

const benches = new Map<string, TScenarioBench>()

/**
 * Стенд фреймворка — один на всё приложение, модульный, а не на страницу:
 * статусы сценариев переживают смену темы и уход на страницу свойств. У
 * каждого фреймворка свой — свои раннер и статусы: прошёл на Vue не значит
 * прошёл на React.
 */
function appBench(framework: string): TScenarioBench {
	let bench = benches.get(framework)

	if (!bench) {
		const host = hostOf(framework)

		bench = createScenarioBench(host, scenariosOf(host))
		benches.set(framework, bench)
	}

	return bench
}

/**
 * Стенд сценариев фреймворка: подложенный через `provide`, иначе общий для
 * приложения. Фреймворк страницы меняется без её перемонтирования, поэтому
 * стенд — вычисляемый.
 */
export function useScenarios(framework: () => string): ComputedRef<TScenarioBench> {
	const provided = inject(SCENARIO_BENCH, null)

	return computed(() => provided ?? appBench(framework()))
}
