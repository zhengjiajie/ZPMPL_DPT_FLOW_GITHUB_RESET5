sap.ui.define(
	[],
	function() {
		return {

			_keys: {
				37: 1,
				38: 1,
				39: 1,
				40: 1
			},

			_preventDefault: function(e) {
				e = e || window.event;
				var found = false;

				if (e.path) {
					for (var i = 0; i < e.path.length; i++) {
						if (!e.path[i].classList) {
							continue;
						}
						for (var j = 0; j < e.path[i].classList.length; j++) {
							if (e.path[i].classList[j] === "ppmFlowNoScroll") {
								found = true;
							}
						}
					}
				} else {
					found = true;
				}
				if (!found) {
					return;
				}

				if (e.preventDefault)
					e.preventDefault();
				e.returnValue = false;
			},

			_preventDefaultForScrollKeys: function(e) {
				var found = false;

				if (e.path) {
					for (var i = 0; i < e.path.length; i++) {
						if (!e.path[i].classList) {
							continue;
						}
						for (var j = 0; j < e.path[i].classList.length; j++) {
							if (e.path[i].classList[j] === "ppmFlowNoScroll") {
								found = true;
							}
						}
					}
				} else {
					found = true;
				}
				if (!found) {
					return;
				}

				if (this._keys && this._keys[e.keyCode]) {
					this._preventDefault(e);
					return false;
				}
			},

			disableScroll: function(element) {
				if (element.addEventListener) // older FF
					element.addEventListener('DOMMouseScroll', this._preventDefault, false);
				element.onwheel = document.onwheel = this._preventDefault; // modern standard
				element.onmousewheel = this._preventDefault; // older browsers, IE
				element.ontouchmove = this._preventDefault; // mobile
				element.onkeydown = this._preventDefaultForScrollKeys;
			},

			enableScroll: function(element) {
				if (element.removeEventListener)
					element.removeEventListener('DOMMouseScroll', this._preventDefault, false);
				element.onmousewheel = document.onmousewheel = null;
				element.onwheel = null;
				element.ontouchmove = null;
				element.onkeydown = null;
			}
		};
	});