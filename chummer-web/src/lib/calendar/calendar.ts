/**
 * Calendar and Time Tracking System
 * ==================================
 * In-game calendar for Shadowrun 4th Edition.
 * Shadowrun is set in the 2070s, uses standard Gregorian calendar.
 */

/**
 * Shadowrun 4E default game year.
 * Core rulebook timeline starts around 2070.
 */
export const SR4_DEFAULT_YEAR = 2072;

/**
 * Days of the week.
 */
export const DAYS_OF_WEEK = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/**
 * Months of the year.
 */
export const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

export type Month = (typeof MONTHS)[number];

/**
 * Game date representation.
 * Uses in-game Shadowrun dates (typically 2070s).
 */
export interface GameDate {
	readonly year: number;
	readonly month: number; // 1-12
	readonly day: number; // 1-31
}

/**
 * Game date with time.
 */
export interface GameDateTime extends GameDate {
	readonly hour: number; // 0-23
	readonly minute: number; // 0-59
}

/**
 * Event types that can be tracked on the calendar.
 */
export type CalendarEventType =
	| 'session' // Game session
	| 'lifestyle' // Lifestyle payment due
	| 'contact' // Meeting with contact
	| 'mission' // Shadowrun/job
	| 'training' // Skill/attribute training
	| 'initiation' // Magical initiation
	| 'submersion' // Technomancer submersion
	| 'downtime' // General downtime activity
	| 'custom'; // User-defined event

/**
 * Calendar event definition.
 */
export interface CalendarEvent {
	readonly id: string;
	readonly type: CalendarEventType;
	readonly title: string;
	readonly description: string;
	readonly date: GameDate;
	readonly endDate?: GameDate; // For multi-day events
	readonly time?: { hour: number; minute: number };
	readonly duration?: number; // Duration in hours
	readonly recurring?: RecurringPattern;
	readonly linkedExpenseId?: string; // Link to expense log entry
	readonly metadata?: Record<string, unknown>;
}

/**
 * Recurring event pattern.
 */
export interface RecurringPattern {
	readonly frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	readonly interval: number; // Every N days/weeks/months/years
	readonly endDate?: GameDate; // When recurrence stops
	readonly occurrences?: number; // Max number of occurrences
}

/**
 * Lifestyle payment tracking.
 */
export interface LifestylePayment {
	readonly lifestyleId: string;
	readonly lifestyleName: string;
	readonly monthlyCost: number;
	readonly dueDate: GameDate;
	readonly paid: boolean;
	readonly paidDate?: GameDate;
}

/**
 * Calendar week representation.
 */
export interface CalendarWeek {
	readonly weekNumber: number;
	readonly year: number;
	readonly startDate: GameDate;
	readonly endDate: GameDate;
	readonly days: readonly CalendarDay[];
}

/**
 * Single day in the calendar.
 */
export interface CalendarDay {
	readonly date: GameDate;
	readonly dayOfWeek: DayOfWeek;
	readonly isToday: boolean;
	readonly isCurrentMonth: boolean;
	readonly events: readonly CalendarEvent[];
}

/**
 * Campaign timeline state.
 */
export interface CampaignTimeline {
	readonly campaignStart: GameDate;
	readonly currentDate: GameDate;
	readonly events: readonly CalendarEvent[];
	readonly lifestylePayments: readonly LifestylePayment[];
	readonly sessions: readonly GameSession[];
}

/**
 * Game session record.
 */
export interface GameSession {
	readonly id: string;
	readonly number: number;
	readonly date: GameDate;
	readonly realWorldDate: string; // ISO date string
	readonly title: string;
	readonly summary: string;
	readonly karmaAwarded: number;
	readonly nuyenAwarded: number;
	readonly eventIds: readonly string[];
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Create a GameDate from components.
 */
export function createGameDate(year: number, month: number, day: number): GameDate {
	return { year, month, day };
}

/**
 * Create a GameDate from a JavaScript Date.
 */
export function fromJSDate(date: Date): GameDate {
	return {
		year: date.getFullYear(),
		month: date.getMonth() + 1,
		day: date.getDate()
	};
}

/**
 * Convert a GameDate to a JavaScript Date.
 */
export function toJSDate(date: GameDate): Date {
	return new Date(date.year, date.month - 1, date.day);
}

/**
 * Parse an ISO date string to a GameDate.
 */
export function parseGameDate(isoString: string): GameDate {
	const date = new Date(isoString);
	return fromJSDate(date);
}

/**
 * Format a GameDate to ISO string (YYYY-MM-DD).
 */
export function formatGameDateISO(date: GameDate): string {
	const year = date.year.toString().padStart(4, '0');
	const month = date.month.toString().padStart(2, '0');
	const day = date.day.toString().padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Format a GameDate for display.
 */
export function formatGameDate(date: GameDate, format: 'short' | 'long' | 'full' = 'short'): string {
	const monthName = MONTHS[date.month - 1];

	switch (format) {
		case 'short':
			return `${date.month}/${date.day}/${date.year}`;
		case 'long':
			return `${monthName} ${date.day}, ${date.year}`;
		case 'full': {
			const jsDate = toJSDate(date);
			const dayName = DAYS_OF_WEEK[jsDate.getDay()];
			return `${dayName}, ${monthName} ${date.day}, ${date.year}`;
		}
	}
}

/**
 * Get the day of week for a date.
 */
export function getDayOfWeek(date: GameDate): DayOfWeek {
	const jsDate = toJSDate(date);
	return DAYS_OF_WEEK[jsDate.getDay()];
}

/**
 * Get the number of days in a month.
 */
export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

/**
 * Check if a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Compare two dates.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDates(a: GameDate, b: GameDate): number {
	if (a.year !== b.year) return a.year - b.year;
	if (a.month !== b.month) return a.month - b.month;
	return a.day - b.day;
}

/**
 * Check if two dates are the same.
 */
export function isSameDate(a: GameDate, b: GameDate): boolean {
	return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Check if a date falls within a range (inclusive).
 */
export function isDateInRange(date: GameDate, start: GameDate, end: GameDate): boolean {
	return compareDates(date, start) >= 0 && compareDates(date, end) <= 0;
}

/**
 * Add days to a date.
 */
export function addDays(date: GameDate, days: number): GameDate {
	const jsDate = toJSDate(date);
	jsDate.setDate(jsDate.getDate() + days);
	return fromJSDate(jsDate);
}

/**
 * Add months to a date.
 */
export function addMonths(date: GameDate, months: number): GameDate {
	const jsDate = toJSDate(date);
	jsDate.setMonth(jsDate.getMonth() + months);
	return fromJSDate(jsDate);
}

/**
 * Add years to a date.
 */
export function addYears(date: GameDate, years: number): GameDate {
	return { ...date, year: date.year + years };
}

/**
 * Get the difference between two dates in days.
 */
export function daysBetween(start: GameDate, end: GameDate): number {
	const startJs = toJSDate(start);
	const endJs = toJSDate(end);
	const diffMs = endJs.getTime() - startJs.getTime();
	return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the ISO week number for a date.
 */
export function getWeekNumber(date: GameDate): number {
	const jsDate = toJSDate(date);
	const startOfYear = new Date(jsDate.getFullYear(), 0, 1);
	const days = Math.floor((jsDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

/**
 * Get the start of a week (Sunday).
 */
export function getWeekStart(date: GameDate): GameDate {
	const jsDate = toJSDate(date);
	const dayOfWeek = jsDate.getDay();
	return addDays(date, -dayOfWeek);
}

/**
 * Get the end of a week (Saturday).
 */
export function getWeekEnd(date: GameDate): GameDate {
	const jsDate = toJSDate(date);
	const dayOfWeek = jsDate.getDay();
	return addDays(date, 6 - dayOfWeek);
}

/**
 * Get the start of a month.
 */
export function getMonthStart(date: GameDate): GameDate {
	return { ...date, day: 1 };
}

/**
 * Get the end of a month.
 */
export function getMonthEnd(date: GameDate): GameDate {
	return { ...date, day: getDaysInMonth(date.year, date.month) };
}

// ============================================
// CALENDAR GENERATION
// ============================================

/**
 * Generate a calendar week.
 */
export function generateCalendarWeek(
	startDate: GameDate,
	currentDate: GameDate,
	events: readonly CalendarEvent[]
): CalendarWeek {
	const weekStart = getWeekStart(startDate);
	const weekEnd = getWeekEnd(startDate);
	const weekNumber = getWeekNumber(startDate);

	const days: CalendarDay[] = [];
	for (let i = 0; i < 7; i++) {
		const date = addDays(weekStart, i);
		const dayEvents = events.filter((e) => isSameDate(e.date, date));

		days.push({
			date,
			dayOfWeek: DAYS_OF_WEEK[i],
			isToday: isSameDate(date, currentDate),
			isCurrentMonth: date.month === startDate.month,
			events: dayEvents
		});
	}

	return {
		weekNumber,
		year: weekStart.year,
		startDate: weekStart,
		endDate: weekEnd,
		days
	};
}

/**
 * Generate calendar weeks for a month.
 */
export function generateMonthCalendar(
	year: number,
	month: number,
	currentDate: GameDate,
	events: readonly CalendarEvent[]
): readonly CalendarWeek[] {
	const monthStart = createGameDate(year, month, 1);
	const monthEnd = getMonthEnd(monthStart);

	const firstWeekStart = getWeekStart(monthStart);
	const lastWeekEnd = getWeekEnd(monthEnd);

	const weeks: CalendarWeek[] = [];
	let currentWeekStart = firstWeekStart;

	while (compareDates(currentWeekStart, lastWeekEnd) <= 0) {
		weeks.push(generateCalendarWeek(currentWeekStart, currentDate, events));
		currentWeekStart = addDays(currentWeekStart, 7);
	}

	return weeks;
}

// ============================================
// EVENT MANAGEMENT
// ============================================

/**
 * Create a calendar event.
 */
export function createCalendarEvent(
	id: string,
	type: CalendarEventType,
	title: string,
	date: GameDate,
	options: Partial<Omit<CalendarEvent, 'id' | 'type' | 'title' | 'date'>> = {}
): CalendarEvent {
	return {
		id,
		type,
		title,
		date,
		description: options.description ?? '',
		endDate: options.endDate,
		time: options.time,
		duration: options.duration,
		recurring: options.recurring,
		linkedExpenseId: options.linkedExpenseId,
		metadata: options.metadata
	};
}

/**
 * Get events for a specific date.
 */
export function getEventsForDate(events: readonly CalendarEvent[], date: GameDate): readonly CalendarEvent[] {
	return events.filter((event) => {
		// Single day event
		if (!event.endDate) {
			return isSameDate(event.date, date);
		}
		// Multi-day event
		return isDateInRange(date, event.date, event.endDate);
	});
}

/**
 * Get events for a date range.
 */
export function getEventsInRange(
	events: readonly CalendarEvent[],
	start: GameDate,
	end: GameDate
): readonly CalendarEvent[] {
	return events.filter((event) => {
		const eventEnd = event.endDate ?? event.date;
		// Event overlaps with range if it starts before range ends AND ends after range starts
		return compareDates(event.date, end) <= 0 && compareDates(eventEnd, start) >= 0;
	});
}

/**
 * Expand recurring events into individual occurrences.
 */
export function expandRecurringEvent(
	event: CalendarEvent,
	until: GameDate,
	maxOccurrences: number = 100
): readonly CalendarEvent[] {
	if (!event.recurring) {
		return [event];
	}

	const occurrences: CalendarEvent[] = [];
	let currentDate = event.date;
	let count = 0;

	const { frequency, interval, endDate, occurrences: maxCount } = event.recurring;
	const effectiveMax = maxCount ?? maxOccurrences;
	const effectiveEnd = endDate ?? until;

	while (compareDates(currentDate, effectiveEnd) <= 0 && count < effectiveMax) {
		occurrences.push({
			...event,
			id: `${event.id}-${count}`,
			date: currentDate,
			recurring: undefined // Remove recurring from expanded events
		});

		count++;

		switch (frequency) {
			case 'daily':
				currentDate = addDays(currentDate, interval);
				break;
			case 'weekly':
				currentDate = addDays(currentDate, 7 * interval);
				break;
			case 'monthly':
				currentDate = addMonths(currentDate, interval);
				break;
			case 'yearly':
				currentDate = addYears(currentDate, interval);
				break;
		}
	}

	return occurrences;
}

// ============================================
// LIFESTYLE CALCULATIONS
// ============================================

/**
 * Lifestyle costs per month (in nuyen).
 */
export const LIFESTYLE_COSTS: Record<string, number> = {
	Street: 0,
	Squatter: 500,
	Low: 2000,
	Middle: 5000,
	High: 10000,
	Luxury: 100000
} as const;

/**
 * Calculate lifestyle payment due dates.
 */
export function calculateLifestylePayments(
	lifestyleId: string,
	lifestyleName: string,
	monthlyCost: number,
	startDate: GameDate,
	endDate: GameDate
): readonly LifestylePayment[] {
	const payments: LifestylePayment[] = [];
	let dueDate = addMonths(startDate, 1);

	while (compareDates(dueDate, endDate) <= 0) {
		payments.push({
			lifestyleId,
			lifestyleName,
			monthlyCost,
			dueDate,
			paid: false
		});
		dueDate = addMonths(dueDate, 1);
	}

	return payments;
}

/**
 * Get upcoming lifestyle payments.
 */
export function getUpcomingLifestylePayments(
	payments: readonly LifestylePayment[],
	currentDate: GameDate,
	days: number = 30
): readonly LifestylePayment[] {
	const endDate = addDays(currentDate, days);
	return payments.filter(
		(p) => !p.paid && compareDates(p.dueDate, currentDate) >= 0 && compareDates(p.dueDate, endDate) <= 0
	);
}

/**
 * Get overdue lifestyle payments.
 */
export function getOverdueLifestylePayments(
	payments: readonly LifestylePayment[],
	currentDate: GameDate
): readonly LifestylePayment[] {
	return payments.filter((p) => !p.paid && compareDates(p.dueDate, currentDate) < 0);
}

/**
 * Calculate total lifestyle costs for a period.
 */
export function calculateLifestyleCostsForPeriod(
	payments: readonly LifestylePayment[],
	start: GameDate,
	end: GameDate
): number {
	return payments
		.filter((p) => isDateInRange(p.dueDate, start, end))
		.reduce((sum, p) => sum + p.monthlyCost, 0);
}

// ============================================
// TIMELINE UTILITIES
// ============================================

/**
 * Create an empty campaign timeline.
 */
export function createCampaignTimeline(startDate?: GameDate): CampaignTimeline {
	const defaultStart = startDate ?? createGameDate(SR4_DEFAULT_YEAR, 1, 1);
	return {
		campaignStart: defaultStart,
		currentDate: defaultStart,
		events: [],
		lifestylePayments: [],
		sessions: []
	};
}

/**
 * Add an event to the timeline.
 */
export function addEventToTimeline(timeline: CampaignTimeline, event: CalendarEvent): CampaignTimeline {
	return {
		...timeline,
		events: [...timeline.events, event].sort((a, b) => compareDates(a.date, b.date))
	};
}

/**
 * Remove an event from the timeline.
 */
export function removeEventFromTimeline(timeline: CampaignTimeline, eventId: string): CampaignTimeline {
	return {
		...timeline,
		events: timeline.events.filter((e) => e.id !== eventId)
	};
}

/**
 * Advance the current date.
 */
export function advanceTimelineDate(timeline: CampaignTimeline, newDate: GameDate): CampaignTimeline {
	if (compareDates(newDate, timeline.currentDate) <= 0) {
		return timeline; // Can't go backwards
	}
	return { ...timeline, currentDate: newDate };
}

/**
 * Add a game session to the timeline.
 */
export function addSessionToTimeline(timeline: CampaignTimeline, session: GameSession): CampaignTimeline {
	const sessionNumber = timeline.sessions.length + 1;
	const newSession = { ...session, number: sessionNumber };

	// Create a session event
	const sessionEvent = createCalendarEvent(
		`session-${session.id}`,
		'session',
		session.title || `Session ${sessionNumber}`,
		session.date,
		{
			description: session.summary,
			metadata: {
				sessionId: session.id,
				karmaAwarded: session.karmaAwarded,
				nuyenAwarded: session.nuyenAwarded
			}
		}
	);

	return {
		...timeline,
		sessions: [...timeline.sessions, newSession],
		events: [...timeline.events, sessionEvent].sort((a, b) => compareDates(a.date, b.date))
	};
}

/**
 * Get timeline statistics.
 */
export function getTimelineStats(timeline: CampaignTimeline): {
	totalDays: number;
	totalSessions: number;
	totalKarma: number;
	totalNuyen: number;
	eventsByType: Record<CalendarEventType, number>;
} {
	const totalDays = daysBetween(timeline.campaignStart, timeline.currentDate);
	const totalSessions = timeline.sessions.length;
	const totalKarma = timeline.sessions.reduce((sum, s) => sum + s.karmaAwarded, 0);
	const totalNuyen = timeline.sessions.reduce((sum, s) => sum + s.nuyenAwarded, 0);

	const eventsByType: Record<CalendarEventType, number> = {
		session: 0,
		lifestyle: 0,
		contact: 0,
		mission: 0,
		training: 0,
		initiation: 0,
		submersion: 0,
		downtime: 0,
		custom: 0
	};

	timeline.events.forEach((event) => {
		eventsByType[event.type]++;
	});

	return {
		totalDays,
		totalSessions,
		totalKarma,
		totalNuyen,
		eventsByType
	};
}
