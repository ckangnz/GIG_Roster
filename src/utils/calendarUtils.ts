import { RecurringEvent, Weekday } from "../model/model";

/**
 * Formats multiple events into a single .ics string.
 */
export const generateMultiIcsString = (
  rosterDate: string,
  events: RecurringEvent[],
  teamName: string,
  positionName: string
): string => {
  const eventsContent = events
    .map((event) => {
      const start = calculateDateTime(rosterDate, event.day, event.startTime);
      const end = calculateDateTime(rosterDate, event.day, event.endTime);
      const format = (date: Date) =>
        date.toISOString().replace(/-|:|\.\d+/g, "");

      return [
        "BEGIN:VEVENT",
        `DTSTART:${format(start)}`,
        `DTEND:${format(end)}`,
        `SUMMARY:${teamName} · ${event.label} - (${positionName})`,
        "DESCRIPTION:",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GIG Roster//NONSGML v1.0//EN",
    eventsContent,
    "END:VCALENDAR",
  ].join("\r\n");
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
  return generateMultiIcsString(rosterDate, [event], teamName, positionName);
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

  const anchorDate = new Date(year, month - 1, day, hours, minutes);
  const currentDay = anchorDate.getDay();
  const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;

  const mondayDate = new Date(anchorDate);
  mondayDate.setDate(anchorDate.getDate() - daysToSubtract);

  const targetDayIndex = WEEKDAY_INDEX[targetDay];
  const daysToAdd = targetDayIndex === 0 ? 6 : targetDayIndex - 1;

  const finalDate = new Date(mondayDate);
  finalDate.setDate(mondayDate.getDate() + daysToAdd);

  return finalDate;
};
