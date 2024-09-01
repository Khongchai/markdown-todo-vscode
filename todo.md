Time
	In parser, time must always come after the date. If time is detected, add it to the closest date.

Valid syntax #1
<!-- skip -->
# 05/06/2024 
## 13:10:00
- [ ] ...
- [ ] ...

Valid syntax #2
<!-- skip -->
# 05/06/2024 13:10:00
- [ ] ...
- [ ] ...

Valid syntax #3
# 05/06/2024 
13:10:00
- [ ] ...
- [ ] ...
20:00:00 
- [ ] ...
- [ ] ...

TODO:
- [x] Write diagnostics tests
- [ ] Make them pass.
- [ ] Make sure this applies only to the top most date section (this means subtype of date is necessary). `if (!section.containsUnfinishedItems) return dayName + "Done";`
