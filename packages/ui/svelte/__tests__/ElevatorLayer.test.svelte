<script module lang="ts">
	import type { IElevatorKey } from '@soldy-ui/setup'

	/** Шаг сборки: `up` — взять значение ключа, `{ down }` — опустить своё. */
	export type TElevatorStep = 'up' | { readonly down: string }

	/** Уровень цепочки: имя для отчёта и шаги его сборки по порядку. */
	export type TElevatorLevel = {
		readonly name: string
		readonly steps: readonly TElevatorStep[]
	}

	/** Ключ лифта теста — один на все уровни, как ключ коллекции меню. */
	const KEY: IElevatorKey<string> = { name: 'soldy-test:elevator-layer' }
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка: цепочка сборок, вложенных друг в друга. Каждый уровень
	 * по одному ключу берёт значение и опускает своё в заданном порядке — как
	 * пункт с подменю: фасад пункта берёт коллекцию меню над ним, фасад меню
	 * опускает свою. Лифты у уровня — одной фабрики `useElevator()`, по лифту
	 * на шаг, как у расширений сборки. Прочитанное уходит в `onUp` с именем
	 * уровня; следующий уровень — вложенный компонент, своя сборка.
	 */
	import { useElevator } from '@soldy-ui/svelte'
	import Self from './ElevatorLayer.test.svelte'

	type THarnessProps = {
		levels: readonly TElevatorLevel[]
		onUp: (name: string, value: string | undefined) => void
	}

	const props: THarnessProps = $props()

	/** Сборка первого уровня цепочки — при инициализации, как setup-функция. */
	function assemble(getProps: () => THarnessProps): void {
		const { levels, onUp } = getProps()
		const [level] = levels

		if (!level) return

		const elevator = useElevator()

		for (const step of level.steps) {
			if (step === 'up') onUp(level.name, elevator(KEY).up())
			else elevator(KEY).down(step.down)
		}
	}

	assemble(() => props)
</script>

{#if props.levels.length > 1}
	<Self levels={props.levels.slice(1)} onUp={props.onUp} />
{/if}
