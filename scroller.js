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
            this._observer.observe(this._outer, {
                childList : true,
                subtree   : true
            });
            
            this._on(this._inner,  "scroll",    throttler(this._onScroll.bind(this)));
            this._on(this._handle, "mousedown", this._onHandleGrab.bind(this));
            this._on(this._scroll, "mousedown", this._onScrollClick.bind(this));
            
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
            this._handle.style.transform = "translateY(" + clamp(pos, 0, this._heights.max) + "px)";
        },
        
        // Event handlers
        _onScroll : function(e) {
            var top = this._inner.scrollTop;
            
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
            this._translate(pos);
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
            var top    = this._inner.scrollTop,
                pos    = e.pageY - this._rect.top,
                handle = this._heights.handle * this._ratios.up;
            
            if(top * this._ratios.down > pos) {
                top -= handle;
            } else {
                top += handle;
            }
            
            // Update elements
            this._translate(Math.round(top * this._ratios.down));
            this._inner.scrollTop = top;
        }
    };

    win.Scroller = Scroller;
    
}(window));
