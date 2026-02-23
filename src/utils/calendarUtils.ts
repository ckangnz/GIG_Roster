import { RecurringEvent } from "../model/model";

/**
 * Formats a date string (YYYY-MM-DD) and a time string (HH:mm) into a Google Calendar deep link.
 */
export const generateGoogleCalendarUrl = (
  rosterDate: string,
  event: RecurringEvent,
  teamName: string,
  positionName: string
): string => {
  const start = calculateDateTime(rosterDate, event.offsetDays, event.startTime);
  const end = calculateDateTime(rosterDate, event.offsetDays, event.endTime);

  const format = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
  
  const title = encodeURIComponent(`${event.label} - ${teamName} (${positionName})`);
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
  const start = calculateDateTime(rosterDate, event.offsetDays, event.startTime);
  const end = calculateDateTime(rosterDate, event.offsetDays, event.endTime);

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

/**
 * Calculates a Date object from a base YYYY-MM-DD string, an offset in days, and an HH:mm time.
 */
const calculateDateTime = (rosterDate: string, offsetDays: number, timeStr: string): Date => {
  const [year, month, day] = rosterDate.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  // Date constructor uses 0-indexed months
  const date = new Date(year, month - 1, day, hours, minutes);
  date.setDate(date.getDate() + offsetDays);
  
  return date;
};
