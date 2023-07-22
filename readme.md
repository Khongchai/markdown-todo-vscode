# Markdown-todo

This extension adds a simple **deadline** functionality to markdown lists. Simply add a date in the format dd/mm/yyyy before any markdown list to see the days remaining until that date (also warn when the deadline approaches). 

If the deadline is approaching, you get a squiggly line under the date. The remaining days are always appended to the end of the dates' line.

# **Adding a Deadline Section**

```md
<!-- "Today" is 23/07/2023 -->
22/07/2023
- [ ] Turn in math homework
- [ ] Learn German
27/07/2023
- [ ] Turn in English homework
- [ ] Learn French
```

Everything under a deadline is grouped as one. To begin a new deadline, simply add another date before the next list.

## Result:

![]() 

# **Adding Multiple Deadlines**



```md
01/02/2023
This extension non-invasively extends markdown syntax, so you can add whatever you want **anywhere you want**. For example, this paragraph could have been an explanation of the two todo lists below.
- [ ] Walk the dog
- [ ] Feed the cat
02/02/2023
- [ ] Some other stuff you have to do
```

## Result

![]()

# **Ending a Section Early**

Due to the nature of the syntax, once you add a date, the parser will try to match any lists below it as a part of the deadline. Doesn't matter if it's already a new topic and you're writing about something else 300+ lines below the date.

To explicitly end a date section, you can add `<!-- end section -->` comment anywhere below the last list in the section to end it. 

```md
# **Math Stuff**
## 01/02/2023
- [x] Task1
- [x] Task2
## 05/02/2023
- [ ] Task3
<!-- end section -->
# English Stuff_ 
- [ ] Task1
- [ ] Task2
```

## Result

![]()

# Footnotes
- Dates, even if they conform to dd/mm/yyyy format, inside codeblocks are ignored.
- This was made to work in vscode. If you preview it, you won't see all the deadline diagnostics and reports. But the dates syntax are nothing new, it only extends existing markdown syntax. So if you render the markdown, nothing weird will happen. You'll just see the dates.


