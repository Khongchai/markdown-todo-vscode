export default class DateUtil {
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
}
