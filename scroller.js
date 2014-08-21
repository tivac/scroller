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
            var observer = new MutationObserver(throttler(this._calc.bind(this)));

            observer.observe(this._outer, {
                childList : true,
                subtree   : true
            });
            
            this._on(this._inner, "scroll", throttler(this._onScroll.bind(this)));
            this._on(this._handle, "mousedown", this._onGrab.bind(this));
            
            this._calc();
        },
        
        detach : function() {
            this._off();
        },
        
        // Utility Methods
        _calc : function() {
            var heights;
            
            this._rect    = this._outer.getBoundingClientRect();
            this._heights = heights = {
                outer  : this._rect.height,
                inner  : this._inner.scrollHeight,
                handle : this._handle.getBoundingClientRect().height
            };
            
            console.log(this._rect);
            
            this._stepDown = (heights.outer / heights.inner);
            this._stepUp   = (heights.inner / heights.outer);
            
            console.log(this._stepDown, this._stepUp);
        },
        
        // Event handlers
        // TODO: this never scrolls ALL the way to the bottom
        _onScroll : function() {
            var pos = Math.round(this._inner.scrollTop * this._stepDown);
            
            this._handle.style.transform = "translateY(" + pos + "px)";
        },
        
        _onGrab : function(e) {
            console.log("grabbed", e);
            
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
            
            offset = e.pageY - this._rect.top;
            
            // Keep handle in sync
            this._handle.style.transform = "translateY(" + offset + "px)";
            
            // Keep inner in sync
            this._inner.scrollTop = Math.round(offset * this._stepUp);
        },
        
        _onRelease : function(e) {
            console.log("released");
            
            this._dragging.forEach(this._off.bind(this));
            this._dragging = false;
        }
    };

    win.Scroller = Scroller;
    
}(window));
