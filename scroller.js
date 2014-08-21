(function(win) {
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
            
            // Add handle height after any adjustments based on ratios
            this._heights.handle =this._handle.getBoundingClientRect().height;
        },
        
        // Event handlers
        // TODO: this never scrolls ALL the way to the bottom
        _onScroll : function() {
            var pos = Math.round(this._inner.scrollTop * this._ratioDown);
            
            this._handle.style.transform = "translateY(" + pos + "px)";
        },
        
        _onGrab : function(e) {
            if(e.which !== 1) {
                return;
            }
            
            e.preventDefault();
            
            this._dragging = [
                this._on(document, "mousemove", throttler(this._onMove.bind(this))),
                this._on(document, "mouseup", this._onRelease.bind(this))
            ];
        },
        
        _onMove : function(e) {
            var offset;
            
            if(!this._dragging) {
                return;
            }
            
            // Figure out base offset, clamped
            offset = Math.max(
                0,
                Math.min(
                    this._heights.outer - this._heights.handle,
                    e.pageY - this._rect.top
                )
            );
            
            // Update elements
            this._handle.style.transform = "translateY(" + offset + "px)";
            this._inner.scrollTop = Math.round(offset * this._ratioUp);
        },
        
        _onRelease : function(e) {
            this._dragging.forEach(this._off.bind(this));
            this._dragging = false;
        }
    };

    win.Scroller = Scroller;
    
}(window));
