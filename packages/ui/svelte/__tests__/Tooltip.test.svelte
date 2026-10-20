<script lang="ts">
	/**
	 * Тестовая обёртка: подсказка у кнопки так, как её кладёт потребитель, —
	 * Button со ссылкой на панель из scope сниппета `trigger`, текст подсказки —
	 * содержимым. Задержки сняты: их отсчёт проверяет плагин, здесь — что показ
	 * и скрытие доходят до разметки. Пропсы самой подсказки — `tooltip`, они
	 * ложатся поверх задержек.
	 */
	import type { DescriptorSlots, TooltipDescriptor } from '@soldy-ui/setup'
	import { Button, Tooltip, type TooltipProps } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

	type THarnessProps = {
		tooltip?: TooltipProps
	}

	const { tooltip = {} }: THarnessProps = $props()
</script>

{#snippet trigger({ triggerAria }: TTriggerScope)}
	<Button text="Сохранить" class="so-test-trigger" {...triggerAria} />
{/snippet}

<Tooltip openDelay={0} closeDelay={0} {...tooltip} {trigger}>Сохранить черновик</Tooltip>
