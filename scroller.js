(function(win) {
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
            
            up   = scroll.querySelector(".up");
            down = scroll.querySelector(".down");

            if(!inner && !handle) {
                throw new Error("Missing .inner or .handle elements");
            }
            
            this._observer.observe(el, {
                childList : true,
                subtree   : true
            });
            
            this._on(inner,  "scroll",    throttler(this._onScroll.bind(this)));
            this._on(handle, "mousedown", this._onHandleGrab.bind(this));
            this._on(scroll, "click",     this._onScrollClick.bind(this));
            
            this._on(up,     "mousedown", this._onButtonDown.bind(this, "up"));
            this._on(up,     "click",     this._onButtonClick.bind(this));
            
            this._on(down,   "mousedown", this._onButtonDown.bind(this, "down"));
            this._on(down,   "click",     this._onButtonClick.bind(this));
            
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
                "<div class=\"scrollbar\">",
                    "<div class=\"button up\"></div>",
                    "<div class=\"handle\"></div>",
                    "<div class=\"button down\"></div>",
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

            this._rect    = this._outer.getBoundingClientRect();
            this._heights = heights = {
                outer : this._rect.height,
                inner : this._inner.scrollHeight,
                up    : this._outer.querySelector(".button.up").getBoundingClientRect().height,
                down  : this._outer.querySelector(".button.down").getBoundingClientRect().height
            };
            
            // Calculate handle height based on content size diff
            handle = Math.max(
                50,
                Math.round(
                    heights.outer * (heights.outer / heights.inner)
                )
            );
            
            heights.handle = handle;
            heights.max    = heights.outer - handle - heights.up - heights.down;
            heights.min    = heights.up;
                
            scroll = heights.inner - heights.outer - heights.down;
                
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

        _translate : function(pos) {
            pos = clamp(pos, 0, this._heights.max) + this._heights.min;
                
            this._handle.style.transform = "translateY(" + pos + "px)";
        },
                
        _buttonMove : function(dir) {
            var dist = clamp(this._heights.outer * 0.1, 20, Infinity);
            
            // dir being true is up, false is down
            this._inner.scrollTop = this._top + Math.round((dir === "up" ? -1 : 1) * dist);
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
            var top;
                
            this._top = top = this._inner.scrollTop;
            
            this._translate(Math.round(top * this._ratios.down));
        },
        
        _onHandleGrab : function(e) {
            if((e.which || e.buttons) !== 1) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
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
            pos = e.pageY - this._rect.top - this._grab;
            
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
        
        _onScrollClick : function(e) {
            var tgt  = e.target || e.srcElement,
                dir  = (this._top * this._ratios.down) > (e.pageY - this._rect.top),
                // Scroll by 90% of one page
                dist = this._heights.outer * 0.9;
            
            // dir being true is up, false is down
            this._inner.scrollTop = this._top + Math.round((dir ? -1 : 1) * dist);
        },
        
        
        _onButtonDown : function(dir, e) {
            var target  = e.target || e.srcElement,
                release = this._onButtonClick.bind(this),
                click   = this._buttonMove.bind(this, dir, e);
            
            click();
            
            this._holding = {
                handles   : [
                    this._on(document, "mouseup",    release),
                    this._on(target,   "mouseleave", release)
                ],
                
                interval : setInterval(click, 100)
            };
        },
        
        _onButtonClick : function(e) {
            // Prevent _onScrollClick from firing when you let go
            e.stopPropagation();
            
            if(this._holding) {
                this._off(this._holding.handles);
                clearInterval(this._holding.interval);
            }
            
            this._holding = null;
        }
    };

    win.Scroller = Scroller;
    
}(window));
