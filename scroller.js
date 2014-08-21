(function(win) {
    function Scroller(el, config) {
        if(!config) {
            config = {};
        }

        this._outer  = el;
        this._inner  = el.querySelector(".inner");
        this._handle = el.querySelector(".scrollbar .handle");
        
        if(!this._inner && !this._handle) {
            throw new Error("Missing .inner or .handle elements");
        }

        this.attach();
    }
    
    Scroller.prototype = {
        attach : function() {
            var observer = new MutationObserver(throttler(this._calc.bind(this)));

            observer.observe(this._outer, {
                childList : true,
                subtree   : true
            });
            
            this._inner.addEventListener("scroll", throttler(this._onScroll.bind(this)));
            
            this._calc();
        },
        
        detach : function() {
            // TODO: someday
        },
        
        _calc : function() {
            console.log("_calc");
            
            var heights  = {
                    outer  : this._outer.getBoundingClientRect().height,
                    inner  : this._inner.scrollHeight,
                    handle : this._handle.getBoundingClientRect().height
                };
            
            this._ratio = (heights.outer / heights.inner);
            
            console.log(heights, this._ratio);
            
            this._heights = heights;
        },
        
        _onScroll : function() {
            console.log("scroll", this._inner.scrollTop);
            
            var pos = Math.round(this._inner.scrollTop * this._ratio);
            
            console.log(pos);
            
            this._handle.style.transform = "translateY(" + pos + "px)";
        }
    };

    win.Scroller = Scroller;
    
}(window));
