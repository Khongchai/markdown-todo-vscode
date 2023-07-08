<!-- A markdown productivity extension. -->
<!-- Right now, I'm just making a todo extension -->
<!-- The idea is to use vscode's built-in feature to help boost your productivity. -->
<!-- Each new feature should not get in the way of the default markdown rendering -->

<!-- The first example is a date block. A date block can be surrounded by any valid markdown syntax, be it #, **date**, _date_, etc, as long as the date is the only digits or text characters on that same line. -->
<!-- Every single list item inside will be a part of the todos -->

<!-- More than -->

# You can do it like this

## **20/12/2023**

+ [ ] Take the cats out for a walk
- [ ] Wash the computer
- [ ] Practice Klingon

# Or like this, up to you

**12/12/2023**

- [ ] Wash the keyboard
- [ ] Say no to plastic bags before leaving the house (loudly)

_**12/12/2023**_

- [ ] Say no to plastic bags before leaving the house (loudly)
- [ ] Arrange your socks by their level of happiness

# You can also end a todo section by adding this comment 

```md
<!-- end section -->
```

<!-- end section -->

This means that this item below will not be sent diagnostics.

- [ ] Pet the dragon

This is necessary as trying to implicitly close off a todo section will take away the flexibility of this extension. Because _"all valid markdown syntax goes"_, 
we have to let the user tell us when to close off a section and opt out of the items parser.