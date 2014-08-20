(function(win) {
    var Scroller = function(el, config) {
            if(!config) {
                config = {};
            }
            
            this._el = el;
        
            this.attach();
        };
    
    Scroller.prototype = {
        attach : function() {
            var observer = new MutationObserver(throttler(this._calc.bind(this)));

            observer.observe(this._el, {
                childList : true,
                subtree   : true
            });
            
            this._el.addEventListener("scroll", throttler(this._onScroll.bind(this)));
        },
        
        detach : function() {
            // TODO: someday
        },
        
        _calc : function() {
            console.log("_calc");
        },
        
        _onScroll : function() {
            console.log("scroll", this._el.scrollTop);
        }
    };

    win.Scroller = Scroller;
    
}(window));
