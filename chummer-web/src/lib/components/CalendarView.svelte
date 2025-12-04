<script lang="ts">
	/**
	 * Calendar View Component
	 * =======================
	 * Monthly calendar display with events.
	 */

	import { createEventDispatcher } from 'svelte';
	import {
		type CampaignTimeline,
		type CalendarEvent,
		type CalendarWeek,
		type GameDate,
		generateMonthCalendar,
		formatGameDate,
		addMonths,
		isSameDate,
		MONTHS,
		DAYS_OF_WEEK
	} from '$lib/calendar/calendar';

	const dispatch = createEventDispatcher<{
		dateClick: GameDate;
		eventClick: CalendarEvent;
	}>();

	/** The campaign timeline. */
	export let timeline: CampaignTimeline;

	/** Currently displayed month (1-12). */
	export let month: number = timeline.currentDate.month;

	/** Currently displayed year. */
	export let year: number = timeline.currentDate.year;

	/** Generate calendar weeks for the current month. */
	$: weeks = generateMonthCalendar(year, month, timeline.currentDate, timeline.events);

	/** Navigate to previous month. */
	function prevMonth(): void {
		const newDate = addMonths({ year, month, day: 1 }, -1);
		year = newDate.year;
		month = newDate.month;
	}

	/** Navigate to next month. */
	function nextMonth(): void {
		const newDate = addMonths({ year, month, day: 1 }, 1);
		year = newDate.year;
		month = newDate.month;
	}

	/** Go to today (current game date). */
	function goToToday(): void {
		year = timeline.currentDate.year;
		month = timeline.currentDate.month;
	}

	/** Handle date click. */
	function handleDateClick(date: GameDate): void {
		dispatch('dateClick', date);
	}

	/** Handle event click. */
	function handleEventClick(event: CalendarEvent, e: MouseEvent): void {
		e.stopPropagation();
		dispatch('eventClick', event);
	}

	/** Get abbreviated day name. */
	function getShortDayName(day: string): string {
		return day.substring(0, 3);
	}

	/** Get event color. */
	function getEventColor(type: CalendarEvent['type']): string {
		const colors: Record<CalendarEvent['type'], string> = {
			session: '#58A6FF',
			lifestyle: '#D29922',
			contact: '#3FB950',
			mission: '#F85149',
			training: '#A371F7',
			initiation: '#DB61A2',
			submersion: '#39C5CF',
			downtime: '#8B949E',
			custom: '#DB6D28'
		};
		return colors[type];
	}
</script>

<div class="calendar" role="grid" aria-label="Campaign calendar">
	<!-- Calendar Header -->
	<header class="calendar-header">
		<div class="month-nav">
			<button class="nav-btn" on:click={prevMonth} aria-label="Previous month">
				&lsaquo;
			</button>
			<h2 class="current-month">{MONTHS[month - 1]} {year}</h2>
			<button class="nav-btn" on:click={nextMonth} aria-label="Next month">
				&rsaquo;
			</button>
		</div>

		<button class="today-btn" on:click={goToToday}>
			Today
		</button>
	</header>

	<!-- Day Names -->
	<div class="weekday-header" role="row">
		{#each DAYS_OF_WEEK as day}
			<div class="weekday" role="columnheader">{getShortDayName(day)}</div>
		{/each}
	</div>

	<!-- Calendar Grid -->
	<div class="calendar-grid">
		{#each weeks as week}
			<div class="week" role="row">
				{#each week.days as day}
					<button
						class="day"
						class:today={day.isToday}
						class:other-month={!day.isCurrentMonth}
						class:has-events={day.events.length > 0}
						role="gridcell"
						aria-label={formatGameDate(day.date, 'long')}
						aria-current={day.isToday ? 'date' : undefined}
						on:click={() => handleDateClick(day.date)}
					>
						<span class="day-number">{day.date.day}</span>

						{#if day.events.length > 0}
							<div class="day-events">
								{#each day.events.slice(0, 3) as event}
									<button
										class="event-dot"
										style:background={getEventColor(event.type)}
										title={event.title}
										on:click={(e) => handleEventClick(event, e)}
									>
										<span class="sr-only">{event.title}</span>
									</button>
								{/each}
								{#if day.events.length > 3}
									<span class="more-events">+{day.events.length - 3}</span>
								{/if}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Current Date Info -->
	<footer class="calendar-footer">
		<span class="current-date-label">
			Current game date: <strong>{formatGameDate(timeline.currentDate, 'full')}</strong>
		</span>
	</footer>
</div>

<style>
	.calendar {
		display: flex;
		flex-direction: column;
		background: var(--cw-panel-background, #161B22);
		border: 1px solid var(--cw-border, #30363D);
		border-radius: 12px;
		overflow: hidden;
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--cw-border, #30363D);
	}

	.month-nav {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--cw-border, #30363D);
		border-radius: 6px;
		color: var(--cw-text, #E6EDF3);
		font-size: 18px;
		cursor: pointer;
		transition: background 150ms ease, border-color 150ms ease;
	}

	.nav-btn:hover {
		background: var(--cw-hover, rgba(255, 255, 255, 0.05));
		border-color: var(--cw-text, #E6EDF3);
	}

	.current-month {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--cw-text, #E6EDF3);
		min-width: 160px;
		text-align: center;
	}

	.today-btn {
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--cw-border, #30363D);
		border-radius: 6px;
		color: var(--cw-secondary-text, #8B949E);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.today-btn:hover {
		background: var(--cw-accent-primary-alpha, rgba(88, 166, 255, 0.15));
		border-color: var(--cw-accent-primary, #58A6FF);
		color: var(--cw-accent-primary, #58A6FF);
	}

	.weekday-header {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		border-bottom: 1px solid var(--cw-border, #30363D);
	}

	.weekday {
		padding: 12px 8px;
		text-align: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--cw-secondary-text, #8B949E);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.calendar-grid {
		flex: 1;
	}

	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		border-bottom: 1px solid var(--cw-border, #30363D);
	}

	.week:last-child {
		border-bottom: none;
	}

	.day {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px;
		min-height: 80px;
		background: transparent;
		border: none;
		border-right: 1px solid var(--cw-border, #30363D);
		cursor: pointer;
		transition: background 150ms ease;
	}

	.day:last-child {
		border-right: none;
	}

	.day:hover {
		background: var(--cw-hover, rgba(255, 255, 255, 0.03));
	}

	.day.other-month {
		opacity: 0.4;
	}

	.day.today {
		background: var(--cw-accent-primary-alpha, rgba(88, 166, 255, 0.1));
	}

	.day.today .day-number {
		background: var(--cw-accent-primary, #58A6FF);
		color: var(--cw-background, #0D1117);
	}

	.day-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--cw-text, #E6EDF3);
		transition: background 150ms ease;
	}

	.day:hover .day-number {
		background: var(--cw-hover, rgba(255, 255, 255, 0.1));
	}

	.day-events {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
		justify-content: center;
	}

	.event-dot {
		width: 8px;
		height: 8px;
		padding: 0;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: transform 150ms ease;
	}

	.event-dot:hover {
		transform: scale(1.5);
	}

	.more-events {
		font-size: 0.625rem;
		color: var(--cw-secondary-text, #8B949E);
	}

	.calendar-footer {
		padding: 12px 20px;
		border-top: 1px solid var(--cw-border, #30363D);
		text-align: center;
	}

	.current-date-label {
		font-size: 0.875rem;
		color: var(--cw-secondary-text, #8B949E);
	}

	.current-date-label strong {
		color: var(--cw-accent-primary, #58A6FF);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.day {
			min-height: 60px;
			padding: 4px;
		}

		.day-number {
			width: 24px;
			height: 24px;
			font-size: 0.75rem;
		}

		.weekday {
			padding: 8px 4px;
		}
	}
</style>
