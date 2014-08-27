(function(win) {
    var requestAnimationFrame =
            window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame,
        
        cancelAnimationFrame =
            window.cancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.webkitCancelAnimationFrame;
    
    function linear(t) {
        return t;
    }

    function easeOutQuartic(t) {
        return -(Math.pow((t - 1), 4) - 1);
    }
    
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    function Scroller(el, config) {
        if(!config) {
            config = {};
        }
        
        this._outer    = el;
        this._observer = new MutationObserver(throttler(this._onMutation.bind(this)));
        this._events   = {
            count : 0
        };
        
        if(config.attach) {
            this.attach();
        }
    }
    
    Scroller.prototype = {
        // DOM event binding niceties
        _on : function(el, ev, fn) {
            var id = "e" + this._events.count++;
            
            el.addEventListener(ev, fn, false);
            
            this._events[id] = {
                el : el,
                ev : ev,
                fn : fn
            };
            
            return id;
        },
        
        _off : function(id) {
            var self = this,
                events;
            
            if(id) {
                events = Array.isArray(id) ? id : [ id ];
            } else {
                events = Object.keys(this._events);
            }
            
            events.forEach(function(id) {
                var event = self._events[id];
                
                if(id === "count" || !event) {
                    return;
                }
                
                event.el.removeEventListener(event.ev, event.fn);
                
                // Clean up reference & decrement counter so we can re-use the slot
                self._events[id] = null;
                self._events.count--;
            });
        },
        
        // Public-ish API
        attach : function() {
            var el, scroll, inner, handle, up, down;
            
            this._wrap();
            
            el = this._outer;
            
            this._inner  = inner  = el.querySelector(".inner");
            this._scroll = scroll = el.querySelector(".scrollbar");
            this._handle = handle = scroll.querySelector(".handle");
            
            this._up   = up   = el.querySelector(".up");
            this._down = down = el.querySelector(".down");

            if(!inner && !handle) {
                throw new Error("Missing .inner or .handle elements");
            }
            
            this._observer.observe(el, {
                childList : true,
                subtree   : true
            });
            
            this._on(inner, "scroll", throttler(this._onScroll.bind(this)));
            
            // Handle click/drag is different from holdable stuff
            this._on(handle, "mousedown", this._onHandleGrab.bind(this));
            this._on(handle, "click",     this._stopEvent.bind(this));
            
            this._on(scroll, "mousedown", this._onHoldableDown.bind(this, this._scrollHold, 300));
            this._on(scroll, "click",     this._onHoldableRelease.bind(this));
            
            [ up, down ].forEach(function(btn) {
                this._on(btn,     "mousedown", this._onHoldableDown.bind(this, this._buttonHold, 75));
                this._on(btn,     "click",     this._onHoldableRelease.bind(this));
            }.bind(this));
            
            this._calc();
        },
        
        detach : function() {
            this._off();
            this._observer.disconnect();
        },
        
        destroy : function() {
            var self = this;
            
            this.detach();
            
            Object.keys(this).forEach(function(key) {
                self[key] = null;
            });
        },
        
        // Utility Methods
        _stopEvent : function(e) {
            e.preventDefault();
            e.stopPropagation();
        },

        _wrap : function() {
            var el = this._outer,
                outer, frag, parent;
            
            // already wrapped up, bail
            if(el.querySelector(".inner")) {
                return;
            }
            
            parent = el.parentNode;
            
            frag   = document.createDocumentFragment();
            outer  = document.createElement("div");
            
            outer.classList.add("outer");
            
            frag.appendChild(outer);
            
            outer.innerHTML = [
                "<div class=\"scroll-area\">",
                    "<button class=\"up\"></button>",
                    "<div class=\"scrollbar\">",
                        "<div class=\"handle\"></div>",
                    "</div>",
                    "<button class=\"down\"></button>",
                "</div>",
            ].join("\n");
            
            //frag.querySelector(".outer").appendChild(el);
            
            el.classList.add("inner");
            
            parent.insertBefore(frag, el);
                
            this._outer = parent.querySelector(".outer");
            this._outer.appendChild(el);
        },
        
        _calc : function() {
            var heights, handle, scroll;

            this._rects = {
                outer  : this._outer.getBoundingClientRect(),
                scroll : this._scroll.getBoundingClientRect()
            };
                
            this._heights = heights = {
                outer  : this._rects.outer.height,
                inner  : this._inner.scrollHeight,
                scroll : this._rects.scroll.height,
                up     : this._up.getBoundingClientRect().height,
                down   : this._down.getBoundingClientRect().height
            };
                
            // Calculate handle height based on content size diff
            handle = clamp(
                Math.round(
                    heights.outer * (heights.outer / heights.inner)
                ),
                50,
                this._heights.scroll
            );
            
            heights.handle = handle;
            heights.max    = heights.scroll - handle;
                
            scroll = heights.inner - heights.outer;
                
            // Store ratios now that we know handle height
            // used for going from outer <-> inner
            this._ratios = {
                down : (heights.max / scroll),
                up   : (scroll / heights.max)
            };
            
            // position and size handle
            this._onScroll();
            this._handle.style.height = handle + "px";
        },
        
        _scrollTo : function(end, duration, ease) {
            var clock = performance.now(),
                start = this._top,
                step  = function(now) {
                    var elapsed = now - clock;
                    
                    if(elapsed > duration) {
                        this._inner.scrollTop = end;
                        return;
                    }
                    
                    this._inner.scrollTop = start + (end - start) * ease(elapsed / duration);
                    this._raf = requestAnimationFrame(step);
                }.bind(this);
            
            if(this._raf) {
                cancelAnimationFrame(this._raf);
            }
            
            if(!ease) {
                ease = linear;
            }
            
            this._raf = requestAnimationFrame(step);
        },

        // React to scroll buttons being held
        _buttonHold : function(e) {
            var dir  = e.target.classList.contains("up"),
                dist = clamp(this._heights.outer * 0.1, 20, Infinity);
            
            // dir: true is up, false is down
            this._scrollTo(
               this._top + Math.round((dir ? -1 : 1) * dist),
               this._holding.repeat
           );
        },
        
        // React to scrollbar being held
        _scrollHold : function(e, first) {
            var state  = this._holding,
                handle = this._handle.getBoundingClientRect(),
                mouseY = e.pageY - this._rects.scroll.top,
                dir, dist, done;
            
            // Store some state the first time through
            if(first) {
                dir  = mouseY < handle.top && mouseY < handle.bottom;
                dist = Math.round(this._heights.outer * 0.2);
                
                state.iteration = 1;
                state.total     = mouseY - handle[dir ? "top" : "bottom"];
                state.dir       = dir;
                state.dist      = dist;
            } else {
                dir  = state.dir;
                dist = state.dist;
        
                state.iteration++;
            }
            
            // The divisor was chosen because it "feels good". It's... weird.
            dist *= (dir ? -1 : 1) * state.iteration;
            
            // Check if we'd overshoot upwards
            if(dir && handle.top + dist < mouseY) {
                done = dist = mouseY - handle.top;
            }
        
            // Check if we'd overshoot downwards, add half the handle height because it feels better
            if(!dir && handle.bottom + dist > mouseY) {
                done = dist = mouseY - handle.bottom + (handle.height / 2);
            }
        
            this._scrollTo(
                this._top + Math.round(dist * this._ratios.up),
                state.repeat - 100,
                easeOutQuartic
            );
            
            if(done) {
                this._onHoldableRelease(e);
            }
        },
        
        // Event handlers
        _onMutation : function() {
            // Mutation events may not change the height, so check first
            if(this._heights.inner === this._inner.scrollHeight) {
                return;
            }
    
            this._calc();
        },
                
        _onScroll : function() {
            this._top = this._inner.scrollTop;
            
            pos = clamp(Math.round(this._top * this._ratios.down), 0, this._heights.max);
                
            this._handle.style.transform = "translateY(" + pos + "px)";
        },
        
        _onHandleGrab : function(e) {
            if((e.which || e.buttons) !== 1) {
                return;
            }
            
            this._stopEvent(e);
            
            // save reference to event handlers we need just while dragging
            this._dragging = [
                this._on(document,      "mousemove",  throttler(this._onHandleMove.bind(this))),
                this._on(document,      "mouseup",    this._onHandleRelease.bind(this)),
                this._on(document.body, "mouseenter", this._onEnter.bind(this))
            ];
            
            // Store offset of where handle was grabbed for later adjustment
            this._grab = e.pageY - this._handle.getBoundingClientRect().top;
        },
        
        _onHandleMove : function(e) {
            var pos;
            
            if(!this._dragging) {
                return;
            }
            
            // Actual position in the outer container,
            // adjust event Y by subtracting top of the container & where the handle was grabbed.
            pos = e.pageY - this._rects.scroll.top - this._grab;
            
            // Update elements
            this._inner.scrollTop = Math.round(pos * this._ratios.up);
        },
        
        _onHandleRelease : function() {
            this._off(this._dragging);
            this._dragging = false;
        },
        
        // Ensuring that handle is still being held
        _onEnter : function(e) {
            if(!this._dragging || (e.which || e.buttons) === 1) {
                return;
            }
            
            this._onHandleRelease();
        },

        // Generic click & hold support for scrollbar/buttons
        _onHoldableDown : function(fn, repeat, e) {
            var target  = e.target,
                action  = fn.bind(this, e),
                release = this._onHoldableRelease.bind(this);
            
            this._stopEvent(e);
            
            this._holding = {
                repeat   : repeat,
                interval : setInterval(action, repeat),
                handles  : [
                    this._on(document, "mouseup",    release),
                    this._on(target,   "mouseleave", release)
                ]
            };
            
            action(true);
        },
        
        _onHoldableRelease : function(e) {
            // Prevent any bubbling when mouse is released
            this._stopEvent(e);
            
            // Clean up
            if(this._holding) {
                this._off(this._holding.handles);

                clearInterval(this._holding.interval);
            }
            
            this._holding = null;
        }
    };

    win.Scroller = Scroller;
}(window));
