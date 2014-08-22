(function(win) {
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    function Scroller(el, config) {
        if(!config) {
            config = {};
        }
        
        this._outer    = el;
        this._events   = [];
        this._observer = new MutationObserver(throttler(this._calc.bind(this)));
        
        if(config.attach) {
            this.attach();
        }
    }
    
    Scroller.prototype = {
        // DOM event binding niceties
        _on : function(el, ev, fn) {
            el.addEventListener(ev, fn, false);
            
            return this._events.push({
                el : el,
                ev : ev,
                fn : fn
            });
        },
        
        _off : function(id) {
            var events = id ? this._events.splice(id, 1) : this._events;
            
            events.forEach(function(e) {
                e.el.removeEventListener(e.ev, e.fn);
            });
        },
        
        // Public-ish API
        attach : function() {
            var el, scroll, inner, handle;
            
            this._wrap();
            
            el = this._outer;
            
            this._inner  = inner  = el.querySelector(".inner");
            this._scroll = scroll = el.querySelector(".scrollbar");
            this._handle = handle = scroll.querySelector(".handle");

            if(!inner && !handle) {
                throw new Error("Missing .inner or .handle elements");
            }
            
            this._observer.observe(el, {
                childList : true,
                subtree   : true
            });
            
            this._on(inner,  "scroll",    throttler(this._onScroll.bind(this)));
            this._on(handle, "mousedown", this._onHandleGrab.bind(this));
            this._on(scroll, "mousedown", this._onScrollClick.bind(this));
            
            this._calc();
        },
        
        detach : function() {
            this._off();
            this._observer.disconnect();
        },
        
        // Utility Methods
        _wrap : function() {
            var el = this._outer,
                clone, outer, frag, parent;
            
            // already wrapped up, bail
            if(el.querySelector(".inner")) {
                return;
            }
            
            frag   = document.createDocumentFragment();
            clone  = el.cloneNode(true);
            outer  = document.createElement("div");
            parent = el.parentNode;
            
            outer.classList.add("outer");
            
            frag.appendChild(outer);
            
            outer.innerHTML = [
                "<div class=\"scrollbar\">",
                    "<div class=\"button up\"></div>",
                    "<div class=\"handle\"></div>",
                    "<div class=\"button down\"></div>",
                "</div>",
            ].join("\n");
            
            frag.querySelector(".outer").appendChild(clone);
            
            clone.classList.add("inner");
            
            parent.replaceChild(frag, el);
                
            this._outer = parent.querySelector(".outer");
        },
        
        _calc : function() {
            var heights, handle, scroll;

            this._rect    = this._outer.getBoundingClientRect();
            this._heights = heights = {
                outer  : this._rect.height,
                inner  : this._inner.scrollHeight,
                up     : this._outer.querySelector(".button.up").getBoundingClientRect().height,
                down   : this._outer.querySelector(".button.down").getBoundingClientRect().height
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
        
        // Event handlers
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
                this._on(document,      "mousemove",    throttler(this._onHandleMove.bind(this))),
                this._on(document,      "mouseup",      this._onHandleRelease.bind(this)),
                this._on(document.body, "mouseenter",   this._onEnter.bind(this))
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
            this._dragging.forEach(this._off.bind(this));
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
            var tgt = e.target || e.srcElement,
                dir;
            
            // How to determine scroll direction differs, depends
            // on if click was on scrollbar or on scroll button.
            // Scroll checks location of click vs scroll position
            // Button just checks button type
            if(tgt === this._scroll) {
                dir = (this._top * this._ratios.down) > (e.pageY - this._rect.top);
            } else {
                dir = tgt.classList.contains("up");
            }
            
            // Scroll by 90% of one page
            // dir being true is up, false is down
            this._inner.scrollTop = this._top + Math.round((dir ? -1 : 1) * this._heights.outer * 0.9);
        }
    };

    win.Scroller = Scroller;
    
}(window));
