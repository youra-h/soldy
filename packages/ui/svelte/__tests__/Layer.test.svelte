<script lang="ts" generics="TProps extends object">
	/**
	 * Тестовая обёртка: слой без своей разметки, собранный своей setup-функцией.
	 * Сборке нужен компонент — руны и контекст Svelte живут только в нём, — а
	 * разметки у слоя нет, поэтому обёртка печатает его состояние текстом: так
	 * видно, что пропсы дошли до инстанса, а смена инстанса — до разметки.
	 */
	type THarnessProps = {
		/** Setup-функция слоя: `setupInteractive`, `setupValueControl` и соседи. */
		setup: (getProps: () => TProps, mountId: string) => { readonly state: object }
		/** Пропсы слоя — читаются лениво, как `$props()` у компонентов. */
		layer: TProps
	}

	const props: THarnessProps = $props()
	const mountId = $props.id()

	// Сборка — один раз, при инициализации, как у компонентов: setup-функция и
	// пропсы читаются лениво, из замыкания
	const assemble = () => props.setup(() => props.layer, mountId)
	const binding = assemble()
</script>

<output class="so-test-state">{JSON.stringify(binding.state)}</output>
