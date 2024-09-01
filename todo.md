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
- [ ] Fix line being messed up if typed just one 0
- [x] Don't have to show date for all timed sections

