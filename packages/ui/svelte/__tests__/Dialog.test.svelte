<script lang="ts" module>
	/**
	 * Что на странице и в окне:
	 *
	 * - `page` — кнопка страницы, которая открывает окно, и окно с заголовком и
	 *   двумя остановками Tab;
	 * - `footer` — то же, с подвалом (кнопка «Готово»);
	 * - `popover` — в окне поповер с двумя остановками в панели;
	 * - `select` — в окне Select с двумя опциями (`so-test-select`);
	 * - `nested` — нижнее окно (`so-test-lower`), в нём — верхнее
	 *   (`so-test-upper`): пропсы нижнего — `dialog`, верхнего — `upper`.
	 */
	export type TDialogCase = 'page' | 'footer' | 'popover' | 'select' | 'nested'
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка: окно на странице. Открытость тест возвращает пропом
	 * (`visible` и колбэк `onChangeVisible` в пропсах окна), как привязка.
	 * Заголовок, содержимое и подвал разметкой пишутся только в `.svelte`.
	 */
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Button, Dialog, Popover, Select, type DialogProps } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

	type THarnessProps = {
		case?: TDialogCase
		dialog?: DialogProps
		upper?: DialogProps
	}

	const { case: kind = 'page', dialog = {}, upper = {} }: THarnessProps = $props()
</script>

{#snippet title()}Настройки{/snippet}

{#snippet footer()}<button class="so-test-ok">Готово</button>{/snippet}

{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<Button text="Ещё" class="so-test-popover-trigger" {...triggerAria} {...triggerDataset} />
{/snippet}

<div>
	<button class="so-test-opener">Открыть</button>
	{#if kind === 'nested'}
		<Dialog class="so-test-lower" {...dialog}>
			<button class="so-test-lower-first">Внизу</button>
			<Dialog class="so-test-upper" {...upper}>
				<button class="so-test-upper-first">Наверху</button>
			</Dialog>
		</Dialog>
	{:else}
		<Dialog {title} footer={kind === 'footer' ? footer : undefined} {...dialog}>
			{#if kind === 'popover'}
				<Popover {trigger}>
					<button class="so-test-popover-first">Первая</button>
					<button class="so-test-popover-second">Вторая</button>
				</Popover>
			{:else if kind === 'select'}
				<Select class="so-test-select">
					<Select.Item value="a" text="Первый" />
					<Select.Item value="b" text="Второй" />
				</Select>
			{:else}
				<button class="so-test-first">Первая</button>
				<button class="so-test-second">Вторая</button>
			{/if}
		</Dialog>
	{/if}
</div>
