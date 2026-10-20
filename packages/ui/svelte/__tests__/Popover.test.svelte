<script lang="ts" module>
	/**
	 * Что вокруг поповера и что в его панели:
	 *
	 * - `page` — кнопки страницы до и после поповера (откуда прийти и куда уйти
	 *   по Tab), в панели — две остановки;
	 * - `text` — то же, но в панели только текст: остановок в ней нет;
	 * - `alone` — поповер без соседей, в панели две остановки;
	 * - `nested` — страница, в панели внешнего поповера (`so-test-outer`) —
	 *   остановка и внутренний поповер (`so-test-inner`);
	 * - `tooltip` — поповер без крестика, в панели — кнопка с подсказкой;
	 * - `select` — страница, в панели — Select с двумя опциями
	 *   (`so-test-select`);
	 * - `locale` — два поповера под провайдером локали `locale`: с крестиком и
	 *   без него (`so-test-bare`).
	 */
	export type TPopoverCase =
		| 'page'
		| 'text'
		| 'alone'
		| 'nested'
		| 'tooltip'
		| 'select'
		| 'locale'
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка: поповер с триггером так, как его кладёт потребитель, —
	 * Button со связкой и видом из scope сниппета `trigger`. Содержимое панели
	 * разметкой пишется только в `.svelte`. Пропсы самого поповера —
	 * `popover`, подсказки в его панели — `tooltip`.
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import type { DescriptorSlots, PopoverDescriptor, TooltipDescriptor } from '@soldy-ui/setup'
	import {
		Button,
		LocaleProvider,
		Popover,
		Select,
		Tooltip,
		type PopoverProps,
		type TooltipProps,
	} from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']
	type TTooltipTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

	type THarnessProps = {
		case?: TPopoverCase
		popover?: PopoverProps
		tooltip?: TooltipProps
		locale?: TLocale
	}

	const { case: kind = 'page', popover = {}, tooltip = {}, locale }: THarnessProps = $props()
</script>

{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<Button text="Открыть" class="so-test-trigger" {...triggerAria} {...triggerDataset} />
{/snippet}

{#snippet innerTrigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<Button text="Ещё" class="so-test-inner-trigger" {...triggerAria} {...triggerDataset} />
{/snippet}

{#snippet tooltipTrigger({ triggerAria }: TTooltipTriggerScope)}
	<Button text="Сохранить" class="so-test-tooltip-trigger" {...triggerAria} />
{/snippet}

{#snippet inside()}
	<button class="so-test-first">Первая</button>
	<button class="so-test-second">Вторая</button>
{/snippet}

{#if kind === 'locale' && locale}
	<LocaleProvider {locale}>
		<div>
			<Popover>{@render inside()}</Popover>
			<Popover closable={false} class="so-test-bare">{@render inside()}</Popover>
		</div>
	</LocaleProvider>
{:else if kind === 'alone'}
	<div>
		<Popover {...popover} {trigger}>{@render inside()}</Popover>
	</div>
{:else}
	<div>
		<button class="so-test-before">До</button>
		<Popover {...popover} {trigger}>
			{#if kind === 'text'}
				<p>Только текст</p>
			{:else if kind === 'nested'}
				<button class="so-test-first">Первая</button>
				<Popover class="so-test-inner" trigger={innerTrigger}>
					<button class="so-test-inner-first">Внутри</button>
				</Popover>
			{:else if kind === 'select'}
				<Select class="so-test-select">
					<Select.Item value="a" text="Первый" />
					<Select.Item value="b" text="Второй" />
				</Select>
			{:else if kind === 'tooltip'}
				<Tooltip openDelay={0} closeDelay={0} {...tooltip} trigger={tooltipTrigger}>
					Сохранить черновик
				</Tooltip>
			{:else}
				{@render inside()}
			{/if}
		</Popover>
		<button class="so-test-after">После</button>
	</div>
{/if}
