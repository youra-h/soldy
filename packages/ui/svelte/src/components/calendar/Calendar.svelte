<script lang="ts">
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { ListBox } from '../list-box'
	import { Popover } from '../popover'
	import { CalendarItem } from './item'
	import { setupCalendar } from './setup.component'
	import type { CalendarProps } from './base.component'

	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

	let { ref = $bindable(), ...props }: CalendarProps = $props()
	const mountId = $props.id()

	const binding = setupCalendar(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	// Одна иконка на все стрелки: роли «влево» нет, стрелку в начало строки зеркалит тема
	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Calendar — месяцы своей строкой, подвал — отдельной: в одном ряду с месяцами он
	расширил бы ряд своей шириной. Узлы стоят вплотную: пробел между блоками Svelte
	оставил бы текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<div class="so-calendar__months">
			<!--
				Ключ — место сетки, а не месяц: при листании кнопка заголовка, её поповер и
				живая область остаются тем же узлом — фокус и объявление смены не теряются.
			-->
			{#each state.grids ?? [] as grid, index (index)}
				{@const picker = state.pickers?.[index]}
				<!-- Текст — во вложенном `span` с `titleAria`: живая область — текст. -->
				{#snippet title({ triggerAria, triggerDataset }: TTriggerScope)}
					<Button
						embedded="calendar.title"
						type="button"
						class="so-calendar__title"
						size={state.size}
						disabled={state.disabled}
						{...triggerAria}
						{...triggerDataset}
						><span class="so-calendar__title-text" {...grid.titleAria}>{grid.title}</span
						></Button
					>
				{/snippet}
				<!--
					Блок места — по наличию записи `picker`, а не по ней: Popover и ListBox берут
					`ctrl` и `engine` один раз, а запись новая на каждую смену. Корень поповера —
					`div`: в строчном `span` блочной разметке не место. Листание — одна пара у
					первого месяца, сразу за заголовком: Tab идёт за глазом.
				-->
				<div class="so-calendar__month">
					{#if picker}<Popover
							embedded="calendar.picker"
							class="so-calendar__heading"
							tag="div"
							contained
							edge="top"
							ctrl={picker.popover}
							aria_labelledBy={picker.labelledBy}
							trigger={title}
							><div class="so-calendar__picker">
								<!--
									The list comes before the header: focus on opening lands on it,
									and the theme puts the header on top. The place gets its list
									with the first opening of the popover — a block by its presence:
									ListBox takes `ctrl` and `engine` once.
								-->
								{#if picker.list}<ListBox
										embedded="calendar.picker-list"
										class="so-calendar__picker-list"
										ctrl={picker.list.ctrl}
										engine={picker.list.engine}
										size={state.size}
										indicator="none"
										aria_labelledBy={picker.labelledBy}
									/>{/if}<div class="so-calendar__picker-header">
									<Button
										embedded="calendar.picker-heading"
										type="button"
										class="so-calendar__picker-heading"
										size={state.size}
										{...picker.headingAria}>{picker.heading}</Button
									><Button
										embedded="calendar.picker-prev"
										type="button"
										class="so-calendar__picker-prev"
										size={state.size}
										disabled={picker.prevDisabled}
										{...picker.prevAria}
										><Icon
											embedded="calendar.picker-prev-icon"
											tag={ARROW}
											size={state.size}
										/></Button
									><Button
										embedded="calendar.picker-next"
										type="button"
										class="so-calendar__picker-next"
										size={state.size}
										disabled={picker.nextDisabled}
										{...picker.nextAria}
										><Icon
											embedded="calendar.picker-next-icon"
											tag={ARROW}
											size={state.size}
										/></Button
									>
								</div>
							</div></Popover
						>{/if}{#if index === 0}<Button
							embedded="calendar.prev"
							type="button"
							class="so-calendar__prev"
							size={state.size}
							disabled={state.prevDisabled}
							{...state.prevAria}
						>
							{#if props['prev-icon']}
								{@render props['prev-icon']()}
							{:else}
								<Icon embedded="calendar.prev-icon" tag={ARROW} size={state.size} />
							{/if}
						</Button><Button
							embedded="calendar.next"
							type="button"
							class="so-calendar__next"
							size={state.size}
							disabled={state.nextDisabled}
							{...state.nextAria}
						>
							{#if props['next-icon']}
								{@render props['next-icon']()}
							{:else}
								<Icon embedded="calendar.next-icon" tag={ARROW} size={state.size} />
							{/if}
						</Button>{/if}<table class="so-calendar__grid" {...grid.gridAria}>
						<thead aria-hidden="true">
							<tr class="so-calendar__weekdays">
								{#each state.weekdays ?? [] as weekday, place (place)}
									<th class="so-calendar__weekday">{weekday.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<!--
								Недели — по первой дате, ячейки — по дате: день, оставшийся при
								листании, — тот же узел, с фокусом. День берёт `ctrl` при сборке —
								отсюда `{#key}`. Проброс `item` — только когда слот задан: пустой
								сниппет номеру не уступил бы.
							-->
							{#each grid.weeks as week (week[0]?.date)}
								<tr class="so-calendar__week">
									{#each week as cell (cell.date)}
										{#if cell.item}
											{@const item = cell.item}
											{#snippet day(scope: { text: string })}
												{@render props.item?.({ ...scope, item })}
											{/snippet}
											{#key item}
												<CalendarItem
													ctrl={item}
													children={props.item ? day : undefined}
												/>
											{/key}
										{:else}
											<td class="so-calendar__filler" {...cell.aria}></td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</div>{#if props.footer}<div class="so-calendar__footer">{@render props.footer()}</div>{/if}
	</Dynamic>
{/if}
