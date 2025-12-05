/**
 * Calendar and Time Tracking Tests
 * =================================
 */

import { describe, it, expect } from 'vitest';
import {
	// Date utilities
	createGameDate,
	fromJSDate,
	toJSDate,
	parseGameDate,
	formatGameDateISO,
	formatGameDate,
	getDayOfWeek,
	getDaysInMonth,
	isLeapYear,
	compareDates,
	isSameDate,
	isDateInRange,
	addDays,
	addMonths,
	addYears,
	daysBetween,
	getWeekNumber,
	getWeekStart,
	getWeekEnd,
	getMonthStart,
	getMonthEnd,
	// Calendar generation
	generateCalendarWeek,
	generateMonthCalendar,
	// Event management
	createCalendarEvent,
	getEventsForDate,
	getEventsInRange,
	expandRecurringEvent,
	// Lifestyle calculations
	calculateLifestylePayments,
	getUpcomingLifestylePayments,
	getOverdueLifestylePayments,
	calculateLifestyleCostsForPeriod,
	// Timeline utilities
	createCampaignTimeline,
	addEventToTimeline,
	removeEventFromTimeline,
	advanceTimelineDate,
	addSessionToTimeline,
	getTimelineStats,
	// Constants
	SR4_DEFAULT_YEAR,
	LIFESTYLE_COSTS,
	type GameDate,
	type CalendarEvent
} from '../calendar';

describe('Calendar Date Utilities', () => {
	describe('createGameDate', () => {
		it('should create a game date with given values', () => {
			const date = createGameDate(2072, 6, 15);
			expect(date.year).toBe(2072);
			expect(date.month).toBe(6);
			expect(date.day).toBe(15);
		});
	});

	describe('fromJSDate / toJSDate', () => {
		it('should convert between JS Date and GameDate', () => {
			const jsDate = new Date(2072, 5, 15); // June 15, 2072
			const gameDate = fromJSDate(jsDate);

			expect(gameDate.year).toBe(2072);
			expect(gameDate.month).toBe(6);
			expect(gameDate.day).toBe(15);

			const backToJs = toJSDate(gameDate);
			expect(backToJs.getFullYear()).toBe(2072);
			expect(backToJs.getMonth()).toBe(5);
			expect(backToJs.getDate()).toBe(15);
		});
	});

	describe('parseGameDate', () => {
		it('should parse ISO date strings', () => {
			const date = parseGameDate('2072-06-15');
			expect(date.year).toBe(2072);
			expect(date.month).toBe(6);
			expect(date.day).toBe(15);
		});
	});

	describe('formatGameDateISO', () => {
		it('should format date as ISO string', () => {
			const date = createGameDate(2072, 6, 15);
			expect(formatGameDateISO(date)).toBe('2072-06-15');
		});

		it('should pad single digits', () => {
			const date = createGameDate(2072, 1, 5);
			expect(formatGameDateISO(date)).toBe('2072-01-05');
		});
	});

	describe('formatGameDate', () => {
		it('should format short date', () => {
			const date = createGameDate(2072, 6, 15);
			expect(formatGameDate(date, 'short')).toBe('6/15/2072');
		});

		it('should format long date', () => {
			const date = createGameDate(2072, 6, 15);
			expect(formatGameDate(date, 'long')).toBe('June 15, 2072');
		});

		it('should format full date with day name', () => {
			const date = createGameDate(2072, 6, 15);
			expect(formatGameDate(date, 'full')).toMatch(/\w+, June 15, 2072/);
		});
	});

	describe('getDayOfWeek', () => {
		it('should return the correct day of week', () => {
			// January 1, 2072 is a Friday
			const date = createGameDate(2072, 1, 1);
			expect(getDayOfWeek(date)).toBe('Friday');
		});
	});

	describe('getDaysInMonth', () => {
		it('should return correct days for each month', () => {
			expect(getDaysInMonth(2072, 1)).toBe(31); // January
			expect(getDaysInMonth(2072, 2)).toBe(29); // February (leap year)
			expect(getDaysInMonth(2072, 4)).toBe(30); // April
			expect(getDaysInMonth(2073, 2)).toBe(28); // February (non-leap year)
		});
	});

	describe('isLeapYear', () => {
		it('should correctly identify leap years', () => {
			expect(isLeapYear(2072)).toBe(true);
			expect(isLeapYear(2073)).toBe(false);
			expect(isLeapYear(2100)).toBe(false); // Century not divisible by 400
			expect(isLeapYear(2000)).toBe(true); // Century divisible by 400
		});
	});

	describe('compareDates', () => {
		it('should return negative when first date is earlier', () => {
			const a = createGameDate(2072, 1, 1);
			const b = createGameDate(2072, 1, 2);
			expect(compareDates(a, b)).toBeLessThan(0);
		});

		it('should return positive when first date is later', () => {
			const a = createGameDate(2072, 2, 1);
			const b = createGameDate(2072, 1, 1);
			expect(compareDates(a, b)).toBeGreaterThan(0);
		});

		it('should return 0 when dates are equal', () => {
			const a = createGameDate(2072, 1, 1);
			const b = createGameDate(2072, 1, 1);
			expect(compareDates(a, b)).toBe(0);
		});

		it('should compare years first', () => {
			const a = createGameDate(2071, 12, 31);
			const b = createGameDate(2072, 1, 1);
			expect(compareDates(a, b)).toBeLessThan(0);
		});
	});

	describe('isSameDate', () => {
		it('should return true for same dates', () => {
			const a = createGameDate(2072, 6, 15);
			const b = createGameDate(2072, 6, 15);
			expect(isSameDate(a, b)).toBe(true);
		});

		it('should return false for different dates', () => {
			const a = createGameDate(2072, 6, 15);
			const b = createGameDate(2072, 6, 16);
			expect(isSameDate(a, b)).toBe(false);
		});
	});

	describe('isDateInRange', () => {
		it('should return true for dates within range', () => {
			const date = createGameDate(2072, 6, 15);
			const start = createGameDate(2072, 6, 1);
			const end = createGameDate(2072, 6, 30);
			expect(isDateInRange(date, start, end)).toBe(true);
		});

		it('should return true for dates on boundaries', () => {
			const start = createGameDate(2072, 6, 1);
			const end = createGameDate(2072, 6, 30);
			expect(isDateInRange(start, start, end)).toBe(true);
			expect(isDateInRange(end, start, end)).toBe(true);
		});

		it('should return false for dates outside range', () => {
			const date = createGameDate(2072, 7, 1);
			const start = createGameDate(2072, 6, 1);
			const end = createGameDate(2072, 6, 30);
			expect(isDateInRange(date, start, end)).toBe(false);
		});
	});

	describe('addDays', () => {
		it('should add days correctly', () => {
			const date = createGameDate(2072, 6, 15);
			const result = addDays(date, 10);
			expect(result.day).toBe(25);
		});

		it('should handle month rollover', () => {
			const date = createGameDate(2072, 6, 25);
			const result = addDays(date, 10);
			expect(result.month).toBe(7);
			expect(result.day).toBe(5);
		});

		it('should handle negative days', () => {
			const date = createGameDate(2072, 6, 15);
			const result = addDays(date, -10);
			expect(result.day).toBe(5);
		});
	});

	describe('addMonths', () => {
		it('should add months correctly', () => {
			const date = createGameDate(2072, 6, 15);
			const result = addMonths(date, 3);
			expect(result.month).toBe(9);
			expect(result.year).toBe(2072);
		});

		it('should handle year rollover', () => {
			const date = createGameDate(2072, 10, 15);
			const result = addMonths(date, 5);
			expect(result.year).toBe(2073);
			expect(result.month).toBe(3);
		});
	});

	describe('addYears', () => {
		it('should add years correctly', () => {
			const date = createGameDate(2072, 6, 15);
			const result = addYears(date, 5);
			expect(result.year).toBe(2077);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
		});
	});

	describe('daysBetween', () => {
		it('should calculate days between dates', () => {
			const start = createGameDate(2072, 6, 1);
			const end = createGameDate(2072, 6, 15);
			expect(daysBetween(start, end)).toBe(14);
		});

		it('should return 0 for same dates', () => {
			const date = createGameDate(2072, 6, 15);
			expect(daysBetween(date, date)).toBe(0);
		});

		it('should return negative for reversed dates', () => {
			const start = createGameDate(2072, 6, 15);
			const end = createGameDate(2072, 6, 1);
			expect(daysBetween(start, end)).toBe(-14);
		});
	});

	describe('getWeekNumber', () => {
		it('should return correct week number', () => {
			const date = createGameDate(2072, 1, 15);
			expect(getWeekNumber(date)).toBeGreaterThan(0);
			expect(getWeekNumber(date)).toBeLessThanOrEqual(53);
		});
	});

	describe('getWeekStart / getWeekEnd', () => {
		it('should get week boundaries', () => {
			const date = createGameDate(2072, 6, 15);
			const start = getWeekStart(date);
			const end = getWeekEnd(date);

			expect(getDayOfWeek(start)).toBe('Sunday');
			expect(getDayOfWeek(end)).toBe('Saturday');
			expect(daysBetween(start, end)).toBe(6);
		});
	});

	describe('getMonthStart / getMonthEnd', () => {
		it('should get month boundaries', () => {
			const date = createGameDate(2072, 6, 15);
			const start = getMonthStart(date);
			const end = getMonthEnd(date);

			expect(start.day).toBe(1);
			expect(end.day).toBe(30); // June has 30 days
		});
	});
});

describe('Calendar Generation', () => {
	describe('generateCalendarWeek', () => {
		it('should generate a week with 7 days', () => {
			const date = createGameDate(2072, 6, 15);
			const currentDate = createGameDate(2072, 6, 15);
			const week = generateCalendarWeek(date, currentDate, []);

			expect(week.days).toHaveLength(7);
			expect(week.days[0].dayOfWeek).toBe('Sunday');
			expect(week.days[6].dayOfWeek).toBe('Saturday');
		});

		it('should mark today correctly', () => {
			const date = createGameDate(2072, 6, 15);
			const currentDate = createGameDate(2072, 6, 15);
			const week = generateCalendarWeek(date, currentDate, []);

			const today = week.days.find((d) => d.isToday);
			expect(today).toBeDefined();
			expect(isSameDate(today!.date, currentDate)).toBe(true);
		});

		it('should include events for each day', () => {
			const date = createGameDate(2072, 6, 15);
			const currentDate = createGameDate(2072, 6, 15);
			const event = createCalendarEvent('e1', 'mission', 'Test Run', date);
			const week = generateCalendarWeek(date, currentDate, [event]);

			const dayWithEvent = week.days.find((d) => isSameDate(d.date, date));
			expect(dayWithEvent?.events).toHaveLength(1);
			expect(dayWithEvent?.events[0].title).toBe('Test Run');
		});
	});

	describe('generateMonthCalendar', () => {
		it('should generate weeks covering the entire month', () => {
			const currentDate = createGameDate(2072, 6, 15);
			const weeks = generateMonthCalendar(2072, 6, currentDate, []);

			expect(weeks.length).toBeGreaterThanOrEqual(4);
			expect(weeks.length).toBeLessThanOrEqual(6);
		});
	});
});

describe('Event Management', () => {
	describe('createCalendarEvent', () => {
		it('should create an event with required fields', () => {
			const date = createGameDate(2072, 6, 15);
			const event = createCalendarEvent('e1', 'mission', 'Shadowrun', date);

			expect(event.id).toBe('e1');
			expect(event.type).toBe('mission');
			expect(event.title).toBe('Shadowrun');
			expect(isSameDate(event.date, date)).toBe(true);
		});

		it('should create an event with optional fields', () => {
			const date = createGameDate(2072, 6, 15);
			const endDate = createGameDate(2072, 6, 17);
			const event = createCalendarEvent('e1', 'mission', 'Long Run', date, {
				description: 'A multi-day operation',
				endDate,
				duration: 48
			});

			expect(event.description).toBe('A multi-day operation');
			expect(event.endDate).toEqual(endDate);
			expect(event.duration).toBe(48);
		});
	});

	describe('getEventsForDate', () => {
		it('should return events for a specific date', () => {
			const date = createGameDate(2072, 6, 15);
			const events = [
				createCalendarEvent('e1', 'mission', 'Run 1', date),
				createCalendarEvent('e2', 'mission', 'Run 2', addDays(date, 1)),
				createCalendarEvent('e3', 'contact', 'Meet Fixer', date)
			];

			const result = getEventsForDate(events, date);
			expect(result).toHaveLength(2);
			expect(result.map((e) => e.title)).toContain('Run 1');
			expect(result.map((e) => e.title)).toContain('Meet Fixer');
		});

		it('should include multi-day events', () => {
			const start = createGameDate(2072, 6, 14);
			const end = createGameDate(2072, 6, 16);
			const events = [
				createCalendarEvent('e1', 'mission', 'Long Run', start, { endDate: end })
			];

			const midDate = createGameDate(2072, 6, 15);
			const result = getEventsForDate(events, midDate);
			expect(result).toHaveLength(1);
		});
	});

	describe('getEventsInRange', () => {
		it('should return events within a range', () => {
			const events = [
				createCalendarEvent('e1', 'mission', 'Run 1', createGameDate(2072, 6, 10)),
				createCalendarEvent('e2', 'mission', 'Run 2', createGameDate(2072, 6, 15)),
				createCalendarEvent('e3', 'mission', 'Run 3', createGameDate(2072, 6, 20))
			];

			const start = createGameDate(2072, 6, 12);
			const end = createGameDate(2072, 6, 18);
			const result = getEventsInRange(events, start, end);

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Run 2');
		});
	});

	describe('expandRecurringEvent', () => {
		it('should expand daily recurring events', () => {
			const date = createGameDate(2072, 6, 1);
			const event = createCalendarEvent('e1', 'training', 'Daily Practice', date, {
				recurring: { frequency: 'daily', interval: 1 }
			});

			const until = createGameDate(2072, 6, 5);
			const expanded = expandRecurringEvent(event, until);

			expect(expanded).toHaveLength(5);
		});

		it('should expand weekly recurring events', () => {
			const date = createGameDate(2072, 6, 1);
			const event = createCalendarEvent('e1', 'session', 'Game Night', date, {
				recurring: { frequency: 'weekly', interval: 1 }
			});

			const until = createGameDate(2072, 6, 30);
			const expanded = expandRecurringEvent(event, until);

			expect(expanded.length).toBeGreaterThanOrEqual(4);
		});

		it('should expand monthly recurring events', () => {
			const date = createGameDate(2072, 1, 15);
			const event = createCalendarEvent('e1', 'lifestyle', 'Rent Due', date, {
				recurring: { frequency: 'monthly', interval: 1 }
			});

			const until = createGameDate(2072, 6, 15);
			const expanded = expandRecurringEvent(event, until);

			expect(expanded).toHaveLength(6);
		});

		it('should respect max occurrences', () => {
			const date = createGameDate(2072, 6, 1);
			const event = createCalendarEvent('e1', 'training', 'Daily Practice', date, {
				recurring: { frequency: 'daily', interval: 1, occurrences: 3 }
			});

			const until = createGameDate(2072, 12, 31);
			const expanded = expandRecurringEvent(event, until);

			expect(expanded).toHaveLength(3);
		});
	});
});

describe('Lifestyle Calculations', () => {
	describe('LIFESTYLE_COSTS', () => {
		it('should have correct costs', () => {
			expect(LIFESTYLE_COSTS.Street).toBe(0);
			expect(LIFESTYLE_COSTS.Squatter).toBe(500);
			expect(LIFESTYLE_COSTS.Low).toBe(2000);
			expect(LIFESTYLE_COSTS.Middle).toBe(5000);
			expect(LIFESTYLE_COSTS.High).toBe(10000);
			expect(LIFESTYLE_COSTS.Luxury).toBe(100000);
		});
	});

	describe('calculateLifestylePayments', () => {
		it('should calculate monthly payments', () => {
			const start = createGameDate(2072, 1, 1);
			const end = createGameDate(2072, 6, 1);
			const payments = calculateLifestylePayments('ls1', 'Middle', 5000, start, end);

			expect(payments).toHaveLength(5); // Feb through June
			expect(payments[0].dueDate.month).toBe(2);
			expect(payments[0].monthlyCost).toBe(5000);
			expect(payments[0].paid).toBe(false);
		});
	});

	describe('getUpcomingLifestylePayments', () => {
		it('should get payments due within days', () => {
			const currentDate = createGameDate(2072, 6, 1);
			const payments = [
				{ lifestyleId: 'ls1', lifestyleName: 'Middle', monthlyCost: 5000, dueDate: createGameDate(2072, 6, 15), paid: false },
				{ lifestyleId: 'ls2', lifestyleName: 'Low', monthlyCost: 2000, dueDate: createGameDate(2072, 7, 15), paid: false }, // Outside 30-day window
				{ lifestyleId: 'ls3', lifestyleName: 'High', monthlyCost: 10000, dueDate: createGameDate(2072, 5, 15), paid: false }
			];

			const upcoming = getUpcomingLifestylePayments(payments, currentDate, 30);
			expect(upcoming).toHaveLength(1);
			expect(upcoming[0].lifestyleName).toBe('Middle');
		});
	});

	describe('getOverdueLifestylePayments', () => {
		it('should get unpaid overdue payments', () => {
			const currentDate = createGameDate(2072, 6, 15);
			const payments = [
				{ lifestyleId: 'ls1', lifestyleName: 'Middle', monthlyCost: 5000, dueDate: createGameDate(2072, 6, 1), paid: false },
				{ lifestyleId: 'ls2', lifestyleName: 'Low', monthlyCost: 2000, dueDate: createGameDate(2072, 6, 1), paid: true }
			];

			const overdue = getOverdueLifestylePayments(payments, currentDate);
			expect(overdue).toHaveLength(1);
			expect(overdue[0].lifestyleName).toBe('Middle');
		});
	});

	describe('calculateLifestyleCostsForPeriod', () => {
		it('should sum costs for a period', () => {
			const payments = [
				{ lifestyleId: 'ls1', lifestyleName: 'Middle', monthlyCost: 5000, dueDate: createGameDate(2072, 6, 1), paid: false },
				{ lifestyleId: 'ls2', lifestyleName: 'Low', monthlyCost: 2000, dueDate: createGameDate(2072, 6, 15), paid: false },
				{ lifestyleId: 'ls3', lifestyleName: 'High', monthlyCost: 10000, dueDate: createGameDate(2072, 7, 1), paid: false }
			];

			const start = createGameDate(2072, 6, 1);
			const end = createGameDate(2072, 6, 30);
			const total = calculateLifestyleCostsForPeriod(payments, start, end);

			expect(total).toBe(7000);
		});
	});
});

describe('Timeline Utilities', () => {
	describe('createCampaignTimeline', () => {
		it('should create empty timeline with default start', () => {
			const timeline = createCampaignTimeline();

			expect(timeline.campaignStart.year).toBe(SR4_DEFAULT_YEAR);
			expect(timeline.events).toHaveLength(0);
			expect(timeline.sessions).toHaveLength(0);
		});

		it('should use provided start date', () => {
			const start = createGameDate(2075, 6, 1);
			const timeline = createCampaignTimeline(start);

			expect(timeline.campaignStart.year).toBe(2075);
		});
	});

	describe('addEventToTimeline / removeEventFromTimeline', () => {
		it('should add events in sorted order', () => {
			let timeline = createCampaignTimeline();
			const event1 = createCalendarEvent('e1', 'mission', 'Run 1', createGameDate(2072, 6, 15));
			const event2 = createCalendarEvent('e2', 'mission', 'Run 2', createGameDate(2072, 6, 10));

			timeline = addEventToTimeline(timeline, event1);
			timeline = addEventToTimeline(timeline, event2);

			expect(timeline.events).toHaveLength(2);
			expect(timeline.events[0].id).toBe('e2'); // Earlier date first
			expect(timeline.events[1].id).toBe('e1');
		});

		it('should remove events by id', () => {
			let timeline = createCampaignTimeline();
			const event = createCalendarEvent('e1', 'mission', 'Run 1', createGameDate(2072, 6, 15));
			timeline = addEventToTimeline(timeline, event);
			timeline = removeEventFromTimeline(timeline, 'e1');

			expect(timeline.events).toHaveLength(0);
		});
	});

	describe('advanceTimelineDate', () => {
		it('should advance the current date', () => {
			let timeline = createCampaignTimeline();
			const newDate = createGameDate(2072, 3, 1);
			timeline = advanceTimelineDate(timeline, newDate);

			expect(isSameDate(timeline.currentDate, newDate)).toBe(true);
		});

		it('should not go backwards', () => {
			let timeline = createCampaignTimeline();
			timeline = advanceTimelineDate(timeline, createGameDate(2072, 6, 1));
			const before = timeline.currentDate;
			timeline = advanceTimelineDate(timeline, createGameDate(2072, 3, 1));

			expect(isSameDate(timeline.currentDate, before)).toBe(true);
		});
	});

	describe('addSessionToTimeline', () => {
		it('should add session with auto-increment number', () => {
			let timeline = createCampaignTimeline();
			const session1 = {
				id: 's1',
				number: 0,
				date: createGameDate(2072, 6, 1),
				realWorldDate: '2024-01-01',
				title: 'Session 1',
				summary: 'First run',
				karmaAwarded: 5,
				nuyenAwarded: 5000,
				eventIds: []
			};

			timeline = addSessionToTimeline(timeline, session1);

			expect(timeline.sessions).toHaveLength(1);
			expect(timeline.sessions[0].number).toBe(1);
			// Should also create a session event
			expect(timeline.events.some((e) => e.type === 'session')).toBe(true);
		});
	});

	describe('getTimelineStats', () => {
		it('should calculate timeline statistics', () => {
			let timeline = createCampaignTimeline(createGameDate(2072, 1, 1));
			timeline = advanceTimelineDate(timeline, createGameDate(2072, 6, 1));

			timeline = addSessionToTimeline(timeline, {
				id: 's1',
				number: 0,
				date: createGameDate(2072, 2, 1),
				realWorldDate: '2024-01-01',
				title: 'Session 1',
				summary: '',
				karmaAwarded: 5,
				nuyenAwarded: 5000,
				eventIds: []
			});

			timeline = addSessionToTimeline(timeline, {
				id: 's2',
				number: 0,
				date: createGameDate(2072, 3, 1),
				realWorldDate: '2024-01-08',
				title: 'Session 2',
				summary: '',
				karmaAwarded: 6,
				nuyenAwarded: 7000,
				eventIds: []
			});

			const stats = getTimelineStats(timeline);

			expect(stats.totalSessions).toBe(2);
			expect(stats.totalKarma).toBe(11);
			expect(stats.totalNuyen).toBe(12000);
			expect(stats.eventsByType.session).toBe(2);
		});
	});
});
