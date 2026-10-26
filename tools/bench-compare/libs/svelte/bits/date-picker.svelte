<script lang="ts">
	import { DatePicker } from 'bits-ui'
</script>

<!--
	A date field with a calendar in a popup, as the Bits documentation builds
	it: segments of the field, the trigger, the calendar grid in the content.
-->
<DatePicker.Root>
	<DatePicker.Label>Дата</DatePicker.Label>
	<DatePicker.Input>
		{#snippet children({ segments })}
			{#each segments as { part, value }, index (index)}
				<DatePicker.Segment {part}>{value}</DatePicker.Segment>
			{/each}
			<DatePicker.Trigger aria-label="Календарь">▦</DatePicker.Trigger>
		{/snippet}
	</DatePicker.Input>
	<DatePicker.Portal>
		<DatePicker.Content>
			<DatePicker.Calendar>
				{#snippet children({ months, weekdays })}
					<DatePicker.Header>
						<DatePicker.PrevButton>‹</DatePicker.PrevButton>
						<DatePicker.Heading />
						<DatePicker.NextButton>›</DatePicker.NextButton>
					</DatePicker.Header>
					{#each months as month (month.value.toString())}
						<DatePicker.Grid>
							<DatePicker.GridHead>
								<DatePicker.GridRow>
									{#each weekdays as day, index (index)}
										<DatePicker.HeadCell>{day}</DatePicker.HeadCell>
									{/each}
								</DatePicker.GridRow>
							</DatePicker.GridHead>
							<DatePicker.GridBody>
								{#each month.weeks as dates, week (week)}
									<DatePicker.GridRow>
										{#each dates as date (date.toString())}
											<DatePicker.Cell {date} month={month.value}>
												<DatePicker.Day />
											</DatePicker.Cell>
										{/each}
									</DatePicker.GridRow>
								{/each}
							</DatePicker.GridBody>
						</DatePicker.Grid>
					{/each}
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</DatePicker.Portal>
</DatePicker.Root>
