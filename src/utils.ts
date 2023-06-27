export default class DateUtil {
  /**
   * A buffer so that I can pass the date paramter with month starting at
   * 1 like normal people.
   */
  static getDateLikeNormalPeople(year: number, month: number, day: number) {
    return new Date(year, month - 1, day);
  }

  static getDate() {
    return new Date();
  }
}
