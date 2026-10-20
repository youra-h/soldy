<script lang="ts">
	/**
	 * Тестовая обёртка: слоты Select, которые объявляются только в `.svelte`, —
	 * со своей разметкой и по условию внутри сниппета. Имя слота с дефисом — не
	 * имя сниппета, поэтому сниппет передаётся атрибутом.
	 *
	 * - `own-tags` — свой ряд тегов в слоте `tags`: `Tags` на инстансе и
	 *   коллекции из scope (`own-tags`), а в нём — своя раскладка показанных
	 *   тегов (`.own`). Режим выбора — `mode`;
	 * - `indicator` — Select из данных, отметка-проброс рисуется только у
	 *   опции `a`;
	 * - `groups` — группа разметкой: «Вода» над группой «Фрукты», группы в
	 *   `groups` не заявлены. Движок — снаружи: по нему тест читает секции;
	 * - `locale` — Select с кнопкой очистки под провайдером локали: имя кнопки
	 *   поле собирает из строки локали поддерева.
	 */
	import type { ISelectItem, ITags, ITagsItem, TSelectCollection, TTagsCollection } from '@soldy-ui/core'
	import type { TLocale } from '@soldy-ui/plugins'
	import { LocaleProvider, Select, Tags } from '@soldy-ui/svelte'

	type THarnessProps = {
		case: 'own-tags' | 'indicator' | 'groups' | 'locale'
		/** Режим выбора у `own-tags`. */
		mode?: 'single' | 'multiple'
		/** Движок у `groups`. */
		engine?: TSelectCollection
		/** Значение, которое Select получил наружу, — у `own-tags`. */
		onChangeValue?: (value: unknown) => void
		/** Локаль провайдера у `locale`. */
		locale?: TLocale
	}

	const props: THarnessProps = $props()

	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
	]
</script>

{#snippet own({ shown }: { shown: ReadonlyArray<ITagsItem> })}
	<div class="own">
		{#each shown as item (item.uid)}
			<Tags.Item ctrl={item} />
		{/each}
	</div>
{/snippet}

{#snippet ownTags({ tags, engine }: { tags: ITags; engine: TTagsCollection })}
	<Tags ctrl={tags} {engine} class="own-tags" children={own} />
{/snippet}

{#snippet indicatorIcon({ item, selected }: { item: ISelectItem; selected: boolean })}
	{#if item.value === 'a'}<b class="probe">{selected}</b>{/if}
{/snippet}

{#if props.case === 'own-tags'}
	<Select
		mode={props.mode ?? 'multiple'}
		value={props.mode === 'single' ? 'msk' : ['msk', 'tver']}
		tags={ownTags}
		onChangeValue={(event) => props.onChangeValue?.(event.newValue)}
	>
		<Select.Item value="msk" text="Москва" />
		<Select.Item value="tver" text="Тверь" />
	</Select>
{:else if props.case === 'indicator'}
	<Select items={ITEMS} mode="multiple" indicator="end" item-indicator-icon={indicatorIcon} />
{:else if props.case === 'locale' && props.locale}
	<LocaleProvider locale={props.locale}>
		<Select name="Город" clearable />
	</LocaleProvider>
{:else}
	<Select engine={props.engine}>
		<Select.Item value="water" text="Вода" />
		<Select.Group label="Фрукты">
			<Select.Item value="apple" text="Яблоко" />
			<Select.Item value="pear" text="Груша" />
		</Select.Group>
	</Select>
{/if}
