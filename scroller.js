(function(win) {
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    function Scroller(el, config) {
        if(!config) {
            config = {};
        }
        
        this._outer  = el;
        this._inner  = el.querySelector(".inner");
        this._scroll = el.querySelector(".scrollbar");
        this._handle = this._scroll.querySelector(".handle");
        
        if(!this._inner && !this._handle) {
            throw new Error("Missing .inner or .handle elements");
        }
        
        this._events  = [];
        
        this._observer = new MutationObserver(
            throttler(this._calc.bind(this))
        );

        this.attach();
    }
    
    Scroller.prototype = {
        // DOM event binding niceities
        _on : function(el, ev, fn) {
            el.addEventListener(ev, fn);
            
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
            this._observer.observe(this._outer, {
                childList : true,
                subtree   : true
            });
            
            this._on(this._inner, "scroll", throttler(this._onScroll.bind(this)));
            this._on(this._handle, "mousedown", this._onGrab.bind(this));
            
            this._calc();
        },
        
        detach : function() {
            this._off();
            this._observer.disconnect();
        },
        
        // Utility Methods
        _calc : function() {
            var heights;
            
            this._rect    = this._outer.getBoundingClientRect();
            this._heights = heights = {
                outer  : this._rect.height,
                inner  : this._inner.scrollHeight
            };
            
            // Ratios for going from outer <-> inner
            this._ratioDown = (heights.outer / heights.inner);
            this._ratioUp   = (heights.inner / heights.outer);
            
            // Calculate handle height based on content
            this._handle.style.height = Math.max(
                50,
                Math.round(this._heights.outer * this._ratioDown)
            ) + "px";
            
            // Add heights using handle height after any adjustments based on ratios
            heights.handle = this._handle.getBoundingClientRect().height;
            heights.max    = heights.outer - heights.handle;
        },

        _translate : function(pos) {
            this._handle.style.transform =
                "translateY(" + clamp(pos, 0, this._heights.max) + "px)";
        },
        
        // Event handlers
        _onScroll : function(e) {
            this._translate(Math.floor(this._inner.scrollTop * this._ratioDown));
        },
        
        _onGrab : function(e) {
            if(e.which !== 1) {
                return;
            }
            
            e.preventDefault();
            
            this._dragging = [
                this._on(document, "mousemove", throttler(this._onMove.bind(this))),
                this._on(document, "mouseup", this._onRelease.bind(this)),
                this._on(document.body, "mouseenter", this._onEnter.bind(this))
            ];
            
            this._grab = e.offsetY;
        },
        
        _onMove : function(e) {
            var scroll, handle;
            
            if(!this._dragging) {
                return;
            }
            
            scroll = Math.round((e.pageY - this._rect.top - this._grab) * this._ratioUp);
            handle = Math.round(scroll * this._ratioDown);
            
            // Update elements
            this._translate(handle);
            this._inner.scrollTop = scroll;
        },
        
        _onRelease : function() {
            this._dragging.forEach(this._off.bind(this));
            this._dragging = false;
        },
        
        _onEnter : function(e) {
            if(!this._dragging || (e.which || e.buttons) === 1) {
                return;
            }
            
            this._onRelease();
        }
    };

    win.Scroller = Scroller;
    
}(window));
