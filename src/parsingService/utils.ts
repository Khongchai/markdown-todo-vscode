export default class DateUtil {
  /**
   * A buffer so that I can pass the date paramter with month starting at
   * 1 like normal people.
   */
  static getDateLikeNormalPeople(
    year: number,
    month: number,
    day: number
  ): Date {
    return new Date(year, month - 1, day);
  }

  static getDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  /**
   *  Returns d1 - d2
   */
  static getDiffInDays(d1: Date, d2: Date): number {
    const diff = d1.getTime() - d2.getTime();
    const diffDays = Math.floor(diff / 1000 / 60 / 60 / 24);
    return diffDays;
  }
}
