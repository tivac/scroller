scroller
========

## Rationale ##

I need custom JS/HTML scrollbars for within the GW2 client because webkit doesn't support a lot of features using pseudo element styling. Useful things, like ::before/::after and transitions and filters.

Most existing solutions are jQuery based or very complicated. I don't want that.

This solution is using only the purest vanilla JS (plus CSS & some markup) with special attention paid to performance. By using requestAnimationFrame to throttle scroll events (via [https://github.com/tivac/raf-throttler](https://github.com/tivac/raf-throttler)) and `translateY()` for scrollbar handle position this should be blazing fast all the time.

No thought is given to supporting non-webkit browsers, though I'm not trying to exclude them either. I'm targeting Chromium 28 because that's what is embedded in GW2 currently.

## Example ##

[http://jsbin.com/likez/](http://jsbin.com/likez/)