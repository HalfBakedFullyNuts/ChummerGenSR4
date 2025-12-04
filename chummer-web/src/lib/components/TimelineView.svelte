<script lang="ts">
	/**
	 * Timeline View Component
	 * =======================
	 * Displays a visual timeline of campaign events.
	 */

	import {
		type CampaignTimeline,
		type CalendarEvent,
		type GameDate,
		formatGameDate,
		isSameDate,
		daysBetween,
		compareDates
	} from '$lib/calendar/calendar';

	/** The campaign timeline to display. */
	export let timeline: CampaignTimeline;

	/** Whether to show the event details panel. */
	export let showDetails: boolean = true;

	/** Event type filter (null = show all). */
	export let filterType: CalendarEvent['type'] | null = null;

	/** Currently selected event. */
	let selectedEvent: CalendarEvent | null = null;

	/** Filter events based on type. */
	$: filteredEvents = filterType
		? timeline.events.filter((e) => e.type === filterType)
		: timeline.events;

	/** Group events by month/year for display. */
	$: groupedEvents = groupEventsByMonth(filteredEvents);

	/** Get color for event type. */
	function getEventColor(type: CalendarEvent['type']): string {
		const colors: Record<CalendarEvent['type'], string> = {
			session: 'var(--cw-accent-primary, #58A6FF)',
			lifestyle: 'var(--cw-accent-yellow, #D29922)',
			contact: 'var(--cw-accent-green, #3FB950)',
			mission: 'var(--cw-accent-red, #F85149)',
			training: 'var(--cw-accent-purple, #A371F7)',
			initiation: 'var(--cw-accent-magenta, #DB61A2)',
			submersion: 'var(--cw-accent-cyan, #39C5CF)',
			downtime: 'var(--cw-secondary-text, #8B949E)',
			custom: 'var(--cw-accent-orange, #DB6D28)'
		};
		return colors[type];
	}

	/** Get icon for event type. */
	function getEventIcon(type: CalendarEvent['type']): string {
		const icons: Record<CalendarEvent['type'], string> = {
			session: '🎲',
			lifestyle: '🏠',
			contact: '👤',
			mission: '🎯',
			training: '📚',
			initiation: '✨',
			submersion: '💻',
			downtime: '💤',
			custom: '📌'
		};
		return icons[type];
	}

	/** Group events by month. */
	function groupEventsByMonth(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
		const groups = new Map<string, CalendarEvent[]>();

		events.forEach((event) => {
			const key = `${event.date.year}-${event.date.month.toString().padStart(2, '0')}`;
			const existing = groups.get(key) ?? [];
			groups.set(key, [...existing, event]);
		});

		return groups;
	}

	/** Format month key for display. */
	function formatMonthKey(key: string): string {
		const [year, month] = key.split('-');
		const months = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		return `${months[parseInt(month) - 1]} ${year}`;
	}

	/** Calculate days since campaign start. */
	function daysSinceStart(date: GameDate): number {
		return daysBetween(timeline.campaignStart, date);
	}

	/** Select an event. */
	function selectEvent(event: CalendarEvent): void {
		selectedEvent = selectedEvent?.id === event.id ? null : event;
	}

	/** Check if event is on current date. */
	function isCurrentDate(date: GameDate): boolean {
		return isSameDate(date, timeline.currentDate);
	}
</script>

<div class="timeline-container" role="region" aria-label="Campaign Timeline">
	<!-- Timeline Header -->
	<header class="timeline-header">
		<div class="timeline-stats">
			<span class="stat">
				<strong>{daysBetween(timeline.campaignStart, timeline.currentDate)}</strong> days elapsed
			</span>
			<span class="stat">
				<strong>{timeline.sessions.length}</strong> sessions
			</span>
			<span class="stat">
				<strong>{timeline.events.length}</strong> events
			</span>
		</div>

		<div class="timeline-dates">
			<span>Campaign Start: <strong>{formatGameDate(timeline.campaignStart, 'long')}</strong></span>
			<span>Current Date: <strong>{formatGameDate(timeline.currentDate, 'long')}</strong></span>
		</div>
	</header>

	<!-- Filter Tabs -->
	<div class="filter-tabs" role="tablist" aria-label="Event type filter">
		<button
			class="filter-tab"
			class:active={filterType === null}
			role="tab"
			aria-selected={filterType === null}
			on:click={() => (filterType = null)}
		>
			All
		</button>
		<button
			class="filter-tab"
			class:active={filterType === 'session'}
			role="tab"
			aria-selected={filterType === 'session'}
			on:click={() => (filterType = 'session')}
		>
			Sessions
		</button>
		<button
			class="filter-tab"
			class:active={filterType === 'mission'}
			role="tab"
			aria-selected={filterType === 'mission'}
			on:click={() => (filterType = 'mission')}
		>
			Missions
		</button>
		<button
			class="filter-tab"
			class:active={filterType === 'lifestyle'}
			role="tab"
			aria-selected={filterType === 'lifestyle'}
			on:click={() => (filterType = 'lifestyle')}
		>
			Lifestyle
		</button>
		<button
			class="filter-tab"
			class:active={filterType === 'training'}
			role="tab"
			aria-selected={filterType === 'training'}
			on:click={() => (filterType = 'training')}
		>
			Training
		</button>
	</div>

	<div class="timeline-content">
		<!-- Timeline -->
		<div class="timeline" role="list">
			{#if groupedEvents.size === 0}
				<div class="timeline-empty">
					<p>No events recorded yet.</p>
					<p class="hint">Events will appear here as you track your campaign.</p>
				</div>
			{:else}
				{#each [...groupedEvents.entries()] as [monthKey, monthEvents]}
					<div class="timeline-month">
						<h3 class="month-header">{formatMonthKey(monthKey)}</h3>

						{#each monthEvents as event (event.id)}
							<button
								class="timeline-event"
								class:selected={selectedEvent?.id === event.id}
								class:current={isCurrentDate(event.date)}
								style:--event-color={getEventColor(event.type)}
								role="listitem"
								aria-pressed={selectedEvent?.id === event.id}
								on:click={() => selectEvent(event)}
							>
								<div class="event-marker" aria-hidden="true">
									<span class="event-icon">{getEventIcon(event.type)}</span>
								</div>
								<div class="event-content">
									<div class="event-header">
										<span class="event-date">{formatGameDate(event.date, 'short')}</span>
										<span class="event-type">{event.type}</span>
									</div>
									<h4 class="event-title">{event.title}</h4>
									{#if event.description}
										<p class="event-description">{event.description}</p>
									{/if}
									<span class="event-day-count">Day {daysSinceStart(event.date)}</span>
								</div>
							</button>
						{/each}
					</div>
				{/each}
			{/if}
		</div>

		<!-- Event Details Panel -->
		{#if showDetails && selectedEvent}
			<aside class="event-details" role="complementary" aria-label="Event details">
				<header class="details-header">
					<span class="details-icon" style:color={getEventColor(selectedEvent.type)}>
						{getEventIcon(selectedEvent.type)}
					</span>
					<h3>{selectedEvent.title}</h3>
					<button
						class="close-btn"
						aria-label="Close details"
						on:click={() => (selectedEvent = null)}
					>
						&times;
					</button>
				</header>

				<dl class="details-list">
					<dt>Date</dt>
					<dd>{formatGameDate(selectedEvent.date, 'full')}</dd>

					<dt>Type</dt>
					<dd style:color={getEventColor(selectedEvent.type)}>{selectedEvent.type}</dd>

					<dt>Day</dt>
					<dd>Day {daysSinceStart(selectedEvent.date)} of campaign</dd>

					{#if selectedEvent.endDate}
						<dt>End Date</dt>
						<dd>{formatGameDate(selectedEvent.endDate, 'full')}</dd>

						<dt>Duration</dt>
						<dd>{daysBetween(selectedEvent.date, selectedEvent.endDate) + 1} days</dd>
					{/if}

					{#if selectedEvent.duration}
						<dt>Duration</dt>
						<dd>{selectedEvent.duration} hours</dd>
					{/if}

					{#if selectedEvent.description}
						<dt>Description</dt>
						<dd class="description">{selectedEvent.description}</dd>
					{/if}

					{#if selectedEvent.metadata}
						{#each Object.entries(selectedEvent.metadata) as [key, value]}
							<dt>{key}</dt>
							<dd>{value}</dd>
						{/each}
					{/if}
				</dl>
			</aside>
		{/if}
	</div>
</div>

<style>
	.timeline-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--cw-background, #0D1117);
		color: var(--cw-text, #E6EDF3);
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		background: var(--cw-panel-background, #161B22);
		border-bottom: 1px solid var(--cw-border, #30363D);
		flex-wrap: wrap;
		gap: 12px;
	}

	.timeline-stats {
		display: flex;
		gap: 24px;
	}

	.stat {
		color: var(--cw-secondary-text, #8B949E);
	}

	.stat strong {
		color: var(--cw-text, #E6EDF3);
		font-size: 1.125rem;
	}

	.timeline-dates {
		display: flex;
		gap: 24px;
		font-size: 0.875rem;
		color: var(--cw-secondary-text, #8B949E);
	}

	.timeline-dates strong {
		color: var(--cw-text, #E6EDF3);
	}

	.filter-tabs {
		display: flex;
		gap: 4px;
		padding: 12px 20px;
		background: var(--cw-panel-background, #161B22);
		border-bottom: 1px solid var(--cw-border, #30363D);
		overflow-x: auto;
	}

	.filter-tab {
		padding: 8px 16px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--cw-secondary-text, #8B949E);
		font-size: 0.875rem;
		cursor: pointer;
		white-space: nowrap;
		transition: background 150ms ease, color 150ms ease;
	}

	.filter-tab:hover {
		background: var(--cw-hover, rgba(255, 255, 255, 0.05));
		color: var(--cw-text, #E6EDF3);
	}

	.filter-tab.active {
		background: var(--cw-accent-primary-alpha, rgba(88, 166, 255, 0.15));
		color: var(--cw-accent-primary, #58A6FF);
	}

	.timeline-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.timeline {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}

	.timeline-empty {
		text-align: center;
		padding: 60px 20px;
		color: var(--cw-secondary-text, #8B949E);
	}

	.timeline-empty .hint {
		font-size: 0.875rem;
		margin-top: 8px;
	}

	.timeline-month {
		margin-bottom: 32px;
	}

	.month-header {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cw-secondary-text, #8B949E);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 16px;
		padding-left: 40px;
	}

	.timeline-event {
		display: flex;
		gap: 16px;
		width: 100%;
		padding: 12px;
		margin-bottom: 8px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		transition: background 150ms ease, border-color 150ms ease;
	}

	.timeline-event:hover {
		background: var(--cw-hover, rgba(255, 255, 255, 0.03));
	}

	.timeline-event.selected {
		background: var(--cw-panel-background, #161B22);
		border-color: var(--event-color);
	}

	.timeline-event.current {
		background: var(--cw-accent-primary-alpha, rgba(88, 166, 255, 0.1));
	}

	.event-marker {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--cw-panel-background, #161B22);
		border: 2px solid var(--event-color);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.event-icon {
		font-size: 14px;
	}

	.event-content {
		flex: 1;
		min-width: 0;
	}

	.event-header {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 4px;
	}

	.event-date {
		font-size: 0.75rem;
		color: var(--cw-secondary-text, #8B949E);
	}

	.event-type {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		background: var(--cw-hover, rgba(255, 255, 255, 0.05));
		border-radius: 4px;
		color: var(--event-color);
	}

	.event-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: var(--cw-text, #E6EDF3);
	}

	.event-description {
		margin: 4px 0 0;
		font-size: 0.875rem;
		color: var(--cw-secondary-text, #8B949E);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.event-day-count {
		font-size: 0.75rem;
		color: var(--cw-secondary-text, #8B949E);
		opacity: 0.7;
	}

	.event-details {
		width: 320px;
		background: var(--cw-panel-background, #161B22);
		border-left: 1px solid var(--cw-border, #30363D);
		overflow-y: auto;
	}

	.details-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		border-bottom: 1px solid var(--cw-border, #30363D);
	}

	.details-icon {
		font-size: 1.5rem;
	}

	.details-header h3 {
		flex: 1;
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--cw-secondary-text, #8B949E);
		font-size: 20px;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.close-btn:hover {
		background: var(--cw-hover, rgba(255, 255, 255, 0.1));
	}

	.details-list {
		padding: 16px;
		margin: 0;
	}

	.details-list dt {
		font-size: 0.75rem;
		color: var(--cw-secondary-text, #8B949E);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 16px;
	}

	.details-list dt:first-child {
		margin-top: 0;
	}

	.details-list dd {
		margin: 4px 0 0;
		font-size: 0.875rem;
		color: var(--cw-text, #E6EDF3);
	}

	.details-list dd.description {
		white-space: pre-wrap;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.timeline-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.timeline-content {
			flex-direction: column;
		}

		.event-details {
			width: 100%;
			border-left: none;
			border-top: 1px solid var(--cw-border, #30363D);
			max-height: 50vh;
		}
	}
</style>
