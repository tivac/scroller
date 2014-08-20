(function(win) {
    function Scroller(el, config) {
        if(!config) {
            config = {};
        }

        this._el = el;

        this.attach();
    }
    
    Scroller.prototype = {
        attach : function() {
            var observer = new MutationObserver(throttler(this._calc.bind(this)));

            observer.observe(this._el, {
                childList : true,
                subtree   : true
            });
            
            this._el.addEventListener("scroll", throttler(this._onScroll.bind(this)));
            
            this._calc();
        },
        
        detach : function() {
            // TODO: someday
        },
        
        _calc : function() {
            console.log("_calc");
            
            this._rect   = this._el.getBoundingClientRect();
            this._height = this._rect.height;
            
            console.log(this._rect);
        },
        
        _onScroll : function() {
            console.log("scroll", this._el.scrollTop);
        }
    };

    win.Scroller = Scroller;
}(window));
