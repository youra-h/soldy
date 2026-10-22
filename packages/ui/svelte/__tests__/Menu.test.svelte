<script lang="ts" module>
	/**
	 * Триггеры меню так, как их кладёт потребитель, — сниппеты, которые тест
	 * отдаёт меню пропом `trigger` и из кода (`mount(Menu, { trigger })`):
	 * разметкой сниппет пишется только в `.svelte`, а экспортированный из
	 * модуля видит только модуль.
	 *
	 * - `trigger` — Button со связкой и видом из scope: ARIA и `data-*` врозь;
	 * - `area` — область контекстного меню, строка «файла»: связку из scope она
	 *   берёт, если та есть.
	 */
	import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
	import { Button } from '@soldy-ui/svelte'

	type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

	/**
	 * Разметка меню под проверкой:
	 *
	 * - `items` — флажки «Сетка» (`grid`) и «Линейка» (`ruler`) и действие
	 *   «Изменить» (`edit`);
	 * - `sort` — группа переключателей «Сортировка» (`group`) с «По имени»
	 *   (`name`) и «По дате» (`date`), разделитель и отмеченный флажок «Сетка»;
	 * - `two-groups` — две группы переключателей без подписей: `name` и `date`
	 *   (`group`), `asc` и `desc` (`order`);
	 * - `groups` — группа «Вид» с флажком, разделитель и группа без подписи с
	 *   действием;
	 * - `separator` — ручной разделитель между действиями, `groupSeparators`
	 *   снят;
	 * - `markup-groups` — «Новый» над группой «Правка» (`edits`), разделитель,
	 *   группа переключателей «Сортировка» и «Закрыть» под ней;
	 * - `submenu` — «Изменить · Поделиться → (Ссылка, Почта) · Удалить»,
	 *   пропсы подменю — `share`, за меню — кнопка «После»;
	 * - `submenu-items` — одно подменю «Поделиться» со своими пропсами `share`
	 *   (пункты данными);
	 * - `item-content` — меню из данных (`menu.items`) со слотом
	 *   `item-content`: у пункта `export` в нём действия «PDF» и «PNG»;
	 * - `popover-item` — «Изменить · Срок → (Раньше, Позже) · Поделиться →
	 *   (Ссылка)», пропсы пункта с панелью — `due`, за меню — кнопка «После»;
	 * - `popover-item-slots` — пункт с панелью со своими значком, текстом строки
	 *   со scope и стрелкой, в панели — текст «Календарь»;
	 * - `focus` — меню, открытое с первой отрисовки, с пунктом `a` перед
	 *   пунктом теста вида `focus` с пропсами `part`.
	 */
	export type TMenuCase =
		| 'items'
		| 'sort'
		| 'two-groups'
		| 'groups'
		| 'separator'
		| 'markup-groups'
		| 'submenu'
		| 'submenu-items'
		| 'item-content'
		| 'popover-item'
		| 'popover-item-slots'
		| 'focus'

	/** Пункт теста у `focus`. */
	export type TMenuFocusKind = 'item' | 'checkbox' | 'radio' | 'submenu' | 'popover-item'

	export { trigger, area }
</script>

<script lang="ts">
	/**
	 * Тестовая обёртка: меню разметкой, как `Menu` в спеках Vue и Solid. Пропсы
	 * меню — `menu`, частей — по их именам из описания случаев выше; смена их в
	 * `reactiveProps` — перерисовка родителя, и до частей она доходит пропсами.
	 */
	import type { IMenuItem } from '@soldy-ui/core'
	import {
		Menu,
		type MenuCheckboxItemProps,
		type MenuGroupProps,
		type MenuItemProps,
		type MenuPopoverItemProps,
		type MenuProps,
		type MenuRadioGroupProps,
		type MenuRadioItemProps,
		type MenuSubmenuProps,
	} from '@soldy-ui/svelte'

	type THarnessProps = {
		case: TMenuCase
		menu?: MenuProps
		grid?: MenuCheckboxItemProps
		ruler?: MenuCheckboxItemProps
		edit?: MenuItemProps
		group?: MenuRadioGroupProps
		edits?: MenuGroupProps
		order?: MenuRadioGroupProps
		name?: MenuRadioItemProps
		date?: MenuRadioItemProps
		share?: MenuSubmenuProps
		due?: MenuPopoverItemProps
		focus?: TMenuFocusKind
		/** Пропсы пункта теста у `focus`: `ctrl` и класс. */
		part?: Record<string, unknown>
	}

	const {
		case: kind,
		menu = {},
		grid = {},
		ruler = {},
		edit = {},
		group = {},
		edits = {},
		order = {},
		name = {},
		date = {},
		share = {},
		due = {},
		focus = 'item',
		part = {},
	}: THarnessProps = $props()
</script>

{#snippet trigger({ triggerAria, triggerDataset }: TTriggerScope)}
	<Button text="Действия" class="so-test-trigger" {...triggerAria} {...triggerDataset} />
{/snippet}

{#snippet area({ triggerAria }: TTriggerScope)}
	<div class="so-test-area" {...triggerAria}>Отчёт.pdf</div>
{/snippet}

{#snippet exportItems({ item }: { item: IMenuItem })}
	{#if item.value === 'export'}
		<Menu.Item value="pdf" text="PDF" />
		<Menu.Item value="png" text="PNG" />
	{/if}
{/snippet}

{#snippet dueLeading()}
	<i class="so-test-icon"></i>
{/snippet}

{#snippet dueHeader({ text, open }: { text: string; open: boolean })}
	{text}: {open ? 'открыт' : 'закрыт'}
{/snippet}

{#snippet dueArrow()}
	<b class="so-test-arrow"></b>
{/snippet}

{#if kind === 'items'}
	<Menu {...menu} {trigger}>
		<Menu.CheckboxItem value="grid" text="Сетка" {...grid} />
		<Menu.CheckboxItem value="ruler" text="Линейка" {...ruler} />
		<Menu.Item value="edit" text="Изменить" {...edit} />
	</Menu>
{:else if kind === 'sort'}
	<Menu {...menu} {trigger}>
		<Menu.RadioGroup label="Сортировка" {...group}>
			<Menu.RadioItem value="name" text="По имени" {...name} />
			<Menu.RadioItem value="date" text="По дате" {...date} />
		</Menu.RadioGroup>
		<Menu.Separator />
		<Menu.CheckboxItem value="grid" text="Сетка" selected />
	</Menu>
{:else if kind === 'two-groups'}
	<Menu {...menu} {trigger}>
		<Menu.RadioGroup {...group}>
			<Menu.RadioItem value="name" text="name" />
			<Menu.RadioItem value="date" text="date" />
		</Menu.RadioGroup>
		<Menu.RadioGroup {...order}>
			<Menu.RadioItem value="asc" text="asc" />
			<Menu.RadioItem value="desc" text="desc" />
		</Menu.RadioGroup>
	</Menu>
{:else if kind === 'groups'}
	<Menu {...menu} {trigger}>
		<Menu.Group label="Вид">
			<Menu.CheckboxItem value="grid" text="Сетка" />
		</Menu.Group>
		<Menu.Separator />
		<Menu.Group>
			<Menu.Item value="edit" text="Изменить" />
		</Menu.Group>
	</Menu>
{:else if kind === 'separator'}
	<Menu groupSeparators={false} {...menu} {trigger}>
		<Menu.Item value="edit" text="Изменить" />
		<Menu.Separator />
		<Menu.Item value="remove" text="Удалить" />
	</Menu>
{:else if kind === 'markup-groups'}
	<Menu {...menu} {trigger}>
		<Menu.Item value="new" text="Новый" />
		<Menu.Group label="Правка" {...edits}>
			<Menu.Item value="cut" text="Вырезать" />
			<Menu.Item value="copy" text="Копировать" />
		</Menu.Group>
		<Menu.Separator />
		<Menu.RadioGroup label="Сортировка" value="name">
			<Menu.RadioItem value="name" text="По имени" />
			<Menu.RadioItem value="date" text="По дате" />
		</Menu.RadioGroup>
		<Menu.Item value="close" text="Закрыть" />
	</Menu>
{:else if kind === 'submenu'}
	<div>
		<Menu {...menu} {trigger}>
			<Menu.Item value="edit" text="Изменить" />
			<Menu.Submenu value="share" text="Поделиться" {...share}>
				<Menu.Item value="link" text="Ссылка" />
				<Menu.Item value="mail" text="Почта" />
			</Menu.Submenu>
			<Menu.Item value="remove" text="Удалить" />
		</Menu>
		<button class="so-test-after">После</button>
	</div>
{:else if kind === 'submenu-items'}
	<Menu {...menu} {trigger}>
		<Menu.Submenu value="share" text="Поделиться" {...share} />
	</Menu>
{:else if kind === 'item-content'}
	<Menu {...menu} {trigger} item-content={exportItems} />
{:else if kind === 'popover-item'}
	<div>
		<Menu {...menu} {trigger}>
			<Menu.Item value="edit" text="Изменить" />
			<Menu.PopoverItem value="due" text="Срок" {...due}>
				<button class="so-test-earlier">Раньше</button>
				<button class="so-test-later">Позже</button>
			</Menu.PopoverItem>
			<Menu.Submenu value="share" text="Поделиться">
				<Menu.Item value="link" text="Ссылка" />
			</Menu.Submenu>
		</Menu>
		<button class="so-test-after">После</button>
	</div>
{:else if kind === 'popover-item-slots'}
	<Menu {...menu} {trigger}>
		<Menu.PopoverItem
			value="due"
			text="Срок"
			leading={dueLeading}
			header={dueHeader}
			arrow-icon={dueArrow}
		>
			Календарь
		</Menu.PopoverItem>
	</Menu>
{:else}
	<Menu open {...menu} {trigger}>
		<Menu.Item value="a" text="A" />
		{#if focus === 'item'}
			<Menu.Item {...part} />
		{:else if focus === 'checkbox'}
			<Menu.CheckboxItem {...part} />
		{:else if focus === 'radio'}
			<Menu.RadioGroup label="Вид">
				<Menu.RadioItem {...part} />
			</Menu.RadioGroup>
		{:else if focus === 'submenu'}
			<Menu.Submenu {...part}>
				<Menu.Item value="x" text="X" />
			</Menu.Submenu>
		{:else}
			<Menu.PopoverItem {...part}>
				<p>Панель</p>
			</Menu.PopoverItem>
		{/if}
	</Menu>
{/if}
