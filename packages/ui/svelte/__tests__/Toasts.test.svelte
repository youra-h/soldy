<script lang="ts" module>
	/**
	 * Слоты менеджера, которые задаёт тест:
	 *
	 * - `item` — текст тоста со scope `{ item, text }`: `<strong>` с текстом и
	 *   восклицательным знаком;
	 * - `item-icon` — свой значок со scope `{ item, type }`: `<i>` с видом;
	 * - `empty-icon` — `item-icon`, который ничего не рисует;
	 * - `item-content` — своё содержимое со scope `{ item }`: текст тоста;
	 * - `item-close-icon` — своя иконка крестика.
	 */
	export type TToastsSlot = 'item' | 'item-icon' | 'empty-icon' | 'item-content' | 'item-close-icon'
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка: менеджер тостов вокруг приложения. Под менеджером —
	 * приложение, которое берёт API тостов (`useToasts()`) и отдаёт его тесту в
	 * `onApi`, одиночный тег (`tag`) или набор с тегом (`tags`, пропсы
	 * набора — `tags`). С `locale` — под провайдером
	 * локали. Сниппеты слотов разметкой пишутся только в `.svelte`.
	 */
	import type { IToastsApi, IToastsItem, TToastsItemType } from '@soldy-ui/core'
	import type { TLocale } from '@soldy-ui/plugins'
	import {
		LocaleProvider,
		Tags,
		Toasts,
		type TToastRender,
		type TagsProps,
		type ToastsProps,
	} from '@soldy-ui/svelte'
	import App from './ToastsApp.test.svelte'

	type THarnessProps = {
		toasts?: ToastsProps
		content?: 'app' | 'tag' | 'tags'
		tags?: TagsProps
		locale?: TLocale
		slots?: readonly TToastsSlot[]
		onApi?: (api: IToastsApi<TToastRender>) => void
	}

	const {
		toasts = {},
		content = 'app',
		tags = {},
		locale,
		slots = [],
		onApi,
	}: THarnessProps = $props()
</script>

{#snippet itemText({ item, text }: { item: IToastsItem; text: string })}
	<strong class="so-test-text" data-uid={item.uid}>{text}!</strong>
{/snippet}

{#snippet itemIcon({ item, type }: { item: IToastsItem; type: TToastsItemType | undefined })}
	<i class="so-test-icon" data-uid={item.uid} data-type={type}></i>
{/snippet}

{#snippet emptyIcon()}{/snippet}

{#snippet itemContent({ item }: { item: IToastsItem })}
	<span class="so-test-content">{item.text}</span>
{/snippet}

{#snippet itemCloseIcon()}<i class="so-test-x"></i>{/snippet}

{#snippet manager()}
	<Toasts
		{...toasts}
		item={slots.includes('item') ? itemText : undefined}
		item-icon={slots.includes('empty-icon')
			? emptyIcon
			: slots.includes('item-icon')
				? itemIcon
				: undefined}
		item-content={slots.includes('item-content') ? itemContent : undefined}
		item-close-icon={slots.includes('item-close-icon') ? itemCloseIcon : undefined}
	>
		{#if content === 'tag'}
			<Tags.Item value="a" text="Тег" />
		{:else if content === 'tags'}
			<Tags {...tags}>
				<Tags.Item value="a" text="Тег" />
			</Tags>
		{:else}
			<App {onApi} />
		{/if}
	</Toasts>
{/snippet}

{#if locale}
	<LocaleProvider {locale}>{@render manager()}</LocaleProvider>
{:else}
	{@render manager()}
{/if}
