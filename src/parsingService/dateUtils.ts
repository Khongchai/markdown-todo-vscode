export default class DateUtil {
  /**
   * A buffer so that I can pass the date paramter with month starting at
   * 1 like normal people.
   *
   * Also returns the date at the final minute of the hour
   */
  static getDateLikeNormalPeople(
    year: number,
    month: number,
    day: number,
    hour: number
  ): Date {
    return new Date(year, month - 1, day, hour, 59, 59, 999);
  }

  /**
   * @returns today's date at midnight (00:00:00)
   */
  static getDate(): Date {
    const today = new Date();
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0
    );
  }

  public static dayToMilli(dayCount: number): number {
    return 1000 * 60 * 60 * 24 * dayCount;
  }

  public static milliToDay(milli: number): number {
    return Math.floor(milli / 1000 / 60 / 60 / 24);
  }
}
