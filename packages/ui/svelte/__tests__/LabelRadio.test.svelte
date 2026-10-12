<script lang="ts">
	/**
	 * Тестовая обёртка: группа с одним радио внутри подписи. Корень радио —
	 * `label`, а `label` в `label` HTML запрещает: внутри подписи радио рисуется
	 * с `tag="span"`, его тест передаёт пропом.
	 */
	import { Label, RadioGroup, type RadioGroupProps } from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Тег корня радио. */
		tag?: string
		onChangeValue?: RadioGroupProps['onChangeValue']
	}

	const { tag, onChangeValue }: THarnessProps = $props()
</script>

<RadioGroup {onChangeValue}>
	<Label text="Первый">
		<RadioGroup.Item value="a" {tag} />
	</Label>
</RadioGroup>
