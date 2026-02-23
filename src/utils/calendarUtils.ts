import { RecurringEvent, Weekday } from "../model/model";

/**
 * Formats a date string (YYYY-MM-DD) and a time string (HH:mm) into a Google Calendar deep link.
 */
export const generateGoogleCalendarUrl = (
  rosterDate: string,
  event: RecurringEvent,
  teamName: string,
  positionName: string
): string => {
  const start = calculateDateTime(rosterDate, event.day, event.startTime);
  const end = calculateDateTime(rosterDate, event.day, event.endTime);

  const format = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");

  const title = encodeURIComponent(
    `${event.label} - ${teamName} (${positionName})`
  );
  const dates = `${format(start)}/${format(end)}`;

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=GIG%20Roster%20Event&sf=true&output=xml`;
};

/**
 * Formats event data into an .ics (iCalendar) string.
 */
export const generateIcsString = (
  rosterDate: string,
  event: RecurringEvent,
  teamName: string,
  positionName: string
): string => {
  const start = calculateDateTime(rosterDate, event.day, event.startTime);
  const end = calculateDateTime(rosterDate, event.day, event.endTime);

  const format = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GIG Roster//NONSGML v1.0//EN",
    "BEGIN:VEVENT",
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${event.label} - ${teamName} (${positionName})`,
    "DESCRIPTION:GIG Roster Event",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

/**
 * Triggers a download of a string as a file.
 */
export const downloadIcsFile = (filename: string, content: string) => {
  const element = document.createElement("a");
  const file = new Blob([content], { type: "text/calendar" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const WEEKDAY_INDEX: Record<Weekday, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

/**
 * Calculates a Date object from a base YYYY-MM-DD string and a target weekday in the same week.
 * We define "same week" as Monday to Sunday.
 */
const calculateDateTime = (
  rosterDate: string,
  targetDay: Weekday,
  timeStr: string
): Date => {
  const [year, month, day] = rosterDate.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Date constructor uses 0-indexed months
  const anchorDate = new Date(year, month - 1, day, hours, minutes);

  // Get Monday of the current week
  // getDay() returns 0 for Sunday, 1 for Monday...
  const currentDay = anchorDate.getDay();
  // We want Monday (1) to be the start of the week.
  // If today is Sunday (0), we go back 6 days to get to Monday.
  // If today is Monday (1), we go back 0 days.
  const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;

  const mondayDate = new Date(anchorDate);
  mondayDate.setDate(anchorDate.getDate() - daysToSubtract);

  // Now find the target day relative to Monday
  const targetDayIndex = WEEKDAY_INDEX[targetDay];
  // Convert Sunday (0) to index 6 relative to Monday
  const daysToAdd = targetDayIndex === 0 ? 6 : targetDayIndex - 1;

  const finalDate = new Date(mondayDate);
  finalDate.setDate(mondayDate.getDate() + daysToAdd);

  return finalDate;
};
