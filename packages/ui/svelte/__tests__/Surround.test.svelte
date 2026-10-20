<script lang="ts">
	/**
	 * Тестовая обёртка: компонент в окружении — в подписи `Label` или под
	 * провайдером локали. Содержимое разметкой пишется только в `.svelte`.
	 *
	 * - `label` — подпись `text` вокруг оценки или ползунка (`control`);
	 * - `locale` — провайдер с локалью `locale` вокруг оценки, пагинации или
	 *   ленты (`control`); смена `locale` — смена пропа провайдера.
	 *
	 * Пропсы самого компонента — `rating`, `slider` и `pagination`.
	 */
	import type { TLocale } from '@soldy-ui/plugins'
	import {
		Label,
		LocaleProvider,
		Pagination,
		Rating,
		Scroller,
		Slider,
		type PaginationProps,
		type RatingProps,
		type SliderProps,
	} from '@soldy-ui/svelte'

	type THarnessProps = {
		/** Что вокруг компонента. */
		around: 'label' | 'locale'
		/** Компонент. */
		control: 'rating' | 'slider' | 'pagination' | 'scroller'
		/** Текст подписи. */
		text?: string
		/** Локаль провайдера. */
		locale?: TLocale
		rating?: RatingProps
		slider?: SliderProps
		pagination?: PaginationProps
	}

	const props: THarnessProps = $props()
</script>

{#snippet component()}
	{#if props.control === 'rating'}
		<Rating {...props.rating ?? {}} />
	{:else if props.control === 'slider'}
		<Slider {...props.slider ?? {}} />
	{:else if props.control === 'pagination'}
		<Pagination {...props.pagination ?? {}} />
	{:else}
		<Scroller><span class="so-test-item">Первый</span></Scroller>
	{/if}
{/snippet}

{#if props.around === 'label'}
	<Label text={props.text}>{@render component()}</Label>
{:else if props.locale}
	<LocaleProvider locale={props.locale}>{@render component()}</LocaleProvider>
{/if}
