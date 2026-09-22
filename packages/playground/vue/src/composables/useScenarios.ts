import {
	inject,
	nextTick,
	shallowReactive,
	shallowRef,
	type Component,
	type InjectionKey,
	type ShallowRef,
} from 'vue'
import {
	TScenarioRunner,
	type IScenarioHost,
	type TScenario,
	type TScenarioState,
	type TTopic,
} from '@soldy-ui/playground-shared'
import { findAvailable, SCENARIOS, topicsOf } from '../catalog'
import { fixtureOf } from '../scenarios/fixtures'
import { useEvents } from './useEvents'

/** Что стоит на сцене блока: компонент и все его атрибуты. */
export type TStage = {
	/** Новый на каждый запуск: Vue монтирует компонент заново, а не обновляет прежний. */
	key: number
	component: Component
	bind: Record<string, unknown>
}

/**
 * Страница тестов в сборе: сценарии, раннер и хост Vue.
 *
 * Реактивность — только здесь, в обёртке: раннер общий для стендов всех
 * фреймворков и о Vue не знает. Шаблоны читают снимок состояний, который
 * обновляется по подписке на раннер.
 */
export type TScenarioBench = {
	readonly scenarios: readonly TScenario[]
	readonly topics: readonly TTopic[]
	readonly runner: TScenarioRunner
	/** Состояния сценариев — новым объектом на каждое изменение. */
	readonly states: Readonly<ShallowRef<Readonly<Record<string, TScenarioState>>>>
	/** Что смонтировано на сценах блоков. Реактивно. */
	readonly stages: ReadonlyMap<string, TStage>
	/** Блок отдаёт хосту узел своей сцены — туда хост и монтирует. */
	attach(id: string, scene: HTMLElement): void
	detach(id: string, scene: HTMLElement): void
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

export function createScenarioBench(
	scenarios: readonly TScenario[],
	options: { timeout?: number } = {},
): TScenarioBench {
	const stages = shallowReactive(new Map<string, TStage>())
	const scenes = new Map<string, HTMLElement>()
	let key = 0

	/**
	 * Хост Vue: кладёт компонент на сцену блока и ждёт, пока тот отрисуется.
	 *
	 * Слушатели — все события, объявленные компонентом, и все пишут в журнал
	 * прогона: сценарий видит ровно то, что получил бы потребитель Vue.
	 */
	const host: IScenarioHost = {
		async mount({ scenario, instance, journal }) {
			const entry = findAvailable(scenario.component)
			const component = fixtureOf(scenario)

			if (!entry || !component) {
				throw new Error(`стенд Vue не умеет рисовать «${scenario.id}»`)
			}

			const listeners = useEvents(entry)((name, args) => journal.record(name, args))

			stages.set(scenario.id, {
				key: ++key,
				component,
				bind: { ...scenario.props, ctrl: instance, ...listeners },
			})

			// Кадр, а не только тик: `TElementPlugin` отдаёт узел плагинам через
			// requestAnimationFrame, и до него компонент нарисован, но DOM ещё
			// не слушает — клик сценария ушёл бы в пустоту
			await nextTick()
			await nextFrame()

			const scene = scenes.get(scenario.id)

			if (!scene) throw new Error(`у сценария «${scenario.id}» нет блока на странице`)

			return scene
		},
		async unmount(id) {
			if (stages.delete(id)) await nextTick()
		},
	}

	const runner = new TScenarioRunner({ host, scenarios, timeout: options.timeout })
	const states = shallowRef(runner.snapshot())

	runner.subscribe(() => {
		states.value = runner.snapshot()
	})

	return {
		scenarios,
		topics: topicsOf(scenarios),
		runner,
		states,
		stages,
		attach(id, scene) {
			scenes.set(id, scene)
		},
		detach(id, scene) {
			if (scenes.get(id) === scene) scenes.delete(id)
		},
	}
}

/** Ключ, которым тест подкладывает странице свои сценарии. */
export const SCENARIO_BENCH: InjectionKey<TScenarioBench> = Symbol('scenario-bench')

let app: TScenarioBench | null = null

/**
 * Один стенд на всё приложение, модульный, а не на страницу: статусы
 * сценариев переживают смену темы и уход на страницу свойств.
 */
function appBench(): TScenarioBench {
	app ??= createScenarioBench(SCENARIOS)

	return app
}

/** Стенд сценариев: подложенный через `provide`, иначе общий для приложения. */
export function useScenarios(): TScenarioBench {
	return inject(SCENARIO_BENCH, appBench, true)
}
