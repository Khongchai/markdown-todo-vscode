export default class DateUtil {
  static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }
  /**
   * Returns the date at the final minute of the hour
   */
  static getDateLastMoment(
    years: number,
    months: number,
    days: number,
    hours: number
  ): Date {
    return new Date(years, months, days, hours, 59, 59, 999);
  }

  public static dayToMilli(dayCount: number): number {
    return 1000 * 60 * 60 * 24 * dayCount;
  }

  public static milliToDay(milli: number): number {
    return Math.floor(milli / 1000 / 60 / 60 / 24);
  }

  /**
   * Given a date, return how far it is from now (new Date())
   *
   * If the difference is in hours, just say how many hours away, omitting minutes and seconds.
   * If the difference is in minutes, just say minutes, omitting seconds.
   * If seconds, just say seconds.
   *
   * Example:
   * 1. If the date is 1 hour and 30 minutes away, return "1 hour"
   * 2. If the date is 1 hour and 30 seconds away, return "1 hour"
   * 3. If the date is 1 minute and 30 seconds away, return "1 minute"
   */
  public static getDistanceFromDateToNow(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    const seconds = Math.floor(Math.abs(diff) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let text = "";
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      text = `${days} day${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      text = `${hours} hour${hours > 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      text = `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      text = `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }

    text += diff < 0 ? " past deadline" : " remaining";

    return text;
  }
}
