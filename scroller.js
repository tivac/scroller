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
        // DOM event binding niceties
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
            var heights, handle;
            
            this._rect    = this._outer.getBoundingClientRect();
            this._heights = heights = {
                outer  : this._rect.height,
                inner  : this._inner.scrollHeight
            };
            
            // Calculate handle height based on content ratio
            handle = Math.max(
                50,
                Math.round(
                    this._heights.outer * (heights.outer / heights.inner)
                )
            );
            
            this._handle.style.height = handle + "px";
            
            heights.handle = handle;
            heights.max    = heights.outer - handle;
            
            // Store ratios now that we know handle height
            // used for going from outer <-> inner
            this._ratios = {
                down : (heights.max / (heights.inner - heights.outer)),
                up   : ((heights.inner - heights.outer) / heights.max)
            };
        },

        _translate : function(pos) {
            this._handle.style.transform =
                "translateY(" + clamp(pos, 0, this._heights.max) + "px)";
        },
        
        // Event handlers
        _onScroll : function(e) {
            var top = this._inner.scrollTop;
            
            console.log("scroll", top, this._ratios.down, Math.round(top * this._ratios.down));
            
            this._translate(Math.round(top * this._ratios.down));
        },
        
        _onGrab : function(e) {
            var rect;
            
            if((e.which || e.buttons) !== 1) {
                return;
            }
            
            e.preventDefault();
            
            // Event Handlers
            this._dragging = [
                this._on(document, "mousemove", throttler(this._onMove.bind(this))),
                this._on(document, "mouseup", this._onRelease.bind(this)),
                this._on(document.body, "mouseenter", this._onEnter.bind(this))
            ];
            
            rect = this._handle.getBoundingClientRect();
            
            // Store offset of where handle was grabbed for later adjustment
            this._grab = e.pageY - rect.top;
        },
        
        _onMove : function(e) {
            var scroll, handle;
            
            if(!this._dragging) {
                return;
            }
            
            scroll = Math.round((e.pageY - this._rect.top - this._grab) * this._ratios.up);
            handle = Math.round(scroll * this._ratios.down);
            
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
