export class ParsedItem {
  public content: string;
  public line: number;
  // - [ ] or - [x] || - [X]
  public isChecked: boolean;
  public lineStartOffset: number;

  public constructor(
    content: string,
    line: number,
    lineOffset: number,
    isChecked: boolean
  ) {
    this.content = content;
    this.line = line;
    this.lineStartOffset = lineOffset;
    this.isChecked = isChecked;
  }

  /**
   * Return the `content` string but without the `- [ ]` or `- [x]` part.
   */
  public getListContent() {
    return this.content.substring(5);
  }
}
