// Some helpfull functions
Array.prototype.contains = function (elem) {
	var i;
	for (i = 0; i < this.length; i++) {
		if (this[i] == elem) return 1;
	}
	return 0;
}
Array.prototype.sum = function() {
	var i, sum = 0;
	for (i = 0; i < this.length; i++) {
		sum += this[i];
	}
	return sum;
}
Array.prototype.product = function() {
	var i, prod = 1;
	for (i = 0; i < this.length; i++) {
		prod *= this[i];
	}
	return prod;
}
Array.prototype.max = function() {
	var i, max = this[0] || 0;
	for (i = 1; i < this.length; i++) {
		if (max < this[i]) {
			max = this[i];
		}
	}
	return max;
}
Array.prototype.min = function() {
	var i, min = this[0] || 0;
	for (i = 1; i < this.length; i++) {
		if (min > this[i]) {
			min = this[i];
		}
	}
	return min;
}
// Olstyle aliases
function SUM(arr) {
	return arr.sum();
}
function PROD(arr) {
	return arr.product();
}
function MAX(val1, val2) {
   if (val2) return Math.max(val1, val2);
	return val1.max();
}
function MIN(val1, val2) {
   if (val2) return Math.min(val1, val2);
	return val1.min();
}
function FORMAT(val, digits) {
   return parseFloat(val).toFixed(digits);
}
function SQRT(val) {
	return Math.sqrt(val);
}

// Fromula class defination
Formula = function (form, conf) {
	if (typeof form == 'string') {
		form = document.getElementById(form);
	}
	if (! form) {
		alert('Form required!');
		throw new Exception('Form required!');
	}
	conf = conf || {};
	this.form = form;
	this.elements = {};
	this.expressions = [];
	this.depend = {};
	this.update_list = [];
	this.update_event = conf['update'] || 'manual';
	this.wellform = conf['wellform'] ? true : false;
	if (conf['autoload']) {
		this._autoload();
	}
}

Formula.prototype = {
	addExpr : function (varn, expr) {
		this.expressions.push({
			'varn' : varn,
			'target' : null,
			'expr' : expr,
			'func' : null
		});
		return this;
	},
	_autoload : function () {
		var i, el, attr;
		for (i = 0; i < this.form.elements.length; i++) {
			el = this.form.elements[i];
			attr = el.getAttribute('expr');
			if (attr) {
				this.addExpr(this._eln(el), attr);
			}
		}
		this.compile().update();
	},
	_bind : function (event) {
		var i, el, __T = this;
		var fn = function() {__T._partialUpdate(this);};
		for (i = 0; i < this.form.elements.length; i++) {
			el = this.form.elements[i];
			if (event == 'keypress') {
				el.onkeyup = this.depend[this._eln(el)] ? fn : null;
			} else {
				el.onchange = this.depend[this._eln(el)] ? fn : null;
			}
		}
	},
	_checkDepend : function(var1, var2) {
		var i, dep = this.depend[var1];
		if (dep) {
			for (k = 0; k < dep.length; k++) {
				if (dep[k].varn == var2) {
					return true;
				}
			}
		}
		return false;
	},
	_collect : function (mask) {
		var i, arr = [], elem;
		for (i = 0; i < this.form.elements.length; i++) {
			elem = this.form.elements[i];
			if (elem.name && this._eln(elem) == mask) {
				arr.push(elem);
			}
		}
		return arr;
	},
	compile : function () {
		var builddep, i, ex, vars, code, j, k, el, dep, __T = this;
		this.elements = {};
		this.depend = {}
		builddep = ['keypress', 'change'].contains(this.update_event);
		for (i = 0; i < this.expressions.length; i++) {
			ex = this.expressions[i];
			if (! this.elements[ex.varn]) {
				this.elements[ex.varn] = this._collect(ex.varn);
			}
			ex.target = this.elements[ex.varn];
			vars = ex.expr.match(/\$([a-z0-9_]+)/ig);
			if (vars) {
				code = ex.expr.replace(/\$\$([a-z0-9_]+)/ig, '__T._gva("$1")')
							  .replace(/\$([a-z0-9_]+)/ig, '__T._gv(__P,"$1")');
				for (j = 0; j < vars.length; j++) {
					el = vars[j].replace(/^\$\$?/, '');
					if (builddep) {
						if (! this.depend[el]) {
							this.depend[el] = [];
							this.depend[el].push(ex);
						} else {
							if (! this._checkDepend(el, ex.varn)) {
								this.depend[el].push(ex);
							}
						}
					}
					if (! this.elements[el]) {
						this.elements[el] = this._collect(el);
					}
				}
			}
			try {
				ex.func = eval('(function(__P){return (' + code + ');})');
			} catch (e) {
				alert(e);
			}
		}
		if (builddep) {
			this._bind(this.update_event);
		}
		this.update();
		return this;
	},
	_eln : function (el) {
		return el.name.replace('[]','')
	},
	_elsv : function (el, val) {
		if (el.type == 'checkbox' || el.type == 'radio') {
			el.checked = val > 0;
		} else {
			var t = el.getAttribute('valuetype');
			if ('string' == t) {
				el.value = val;
			} else if ('integer' == t) {
				el.value = parseInt(val);
			} else {
			   if (this.wellform) {
			   	var v = parseFloat(val).toFixed(12).split('.');
			   	if (v[1]) {
			   		v[1] = v[1].replace(/0+$/, '');
			   		if ('' != v[1]) v[0] += '.' + v[1];
			   	}
				   el.value = v[0];
				} else {
				   el.value = parseFloat(val);
				}
			}
		}
	},
	_elv : function (el) {
		if (el.type == 'checkbox' || el.type == 'radio') {
			return el.checked ? 1 : 0;
		}
		var v, t = el.getAttribute('valuetype');
		if ('string' == t) {
			return el.value;
		} else if ('integer' == t) {
			v = parseInt(el.value);
		} else {
			v = parseFloat(el.value);
		}
		return isNaN(v) ? 0 : v;
	},
	_getExpr : function (varn) {
		var i;
		for (i = 0; i < this.expressions.length; i++) {
			if (this.expressions[i].varn == varn) {
				return this.expressions[i];
			}
		}
		return null;
	},
	_gv : function (i, varn) {
		if (this.elements[varn]) {
			var els = this.elements[varn];
			if (els.length == 1) {
				return this._elv(els[0]);
			} else if (i < els.length) {
				return this._elv(els[i]);
			}
		}
		return null;
	},
	_gva : function (varn) {
		var arr = []
		if (this.elements[varn]) {
			var i, els = this.elements[varn];
			for (i = 0; i < els.length; i++) {
				arr.push(this._elv(els[i]));
			}
		}
		return arr;
	},
	_partialUpdate : function (obj) {
		var varn = this._eln(obj);
		this.update_list = [];
		this._queueUpdate(this._eln(obj), 20);
		this._update();
	},
	_queueUpdate : function (varn, deepth) {
		if (deepth <= 0) return;
		var i, dep = this.depend[varn];
		if (dep) {
			for (i = 0; i < dep.length; i++) {
				if (!this.update_list.contains(dep[i])) {
					this.update_list.push(dep[i]);
					this._queueUpdate(dep[i].varn, deepth - 1);
				}
			}
		}
	},
	update : function () {
		this.update_list = this.expressions;
		this._update();
		return this;
	},
	_update : function () {
		var i, j, ex;
		for (i = 0; i < this.update_list.length; i++) {
			ex = this.update_list[i];
			for (j = 0; j < ex.target.length; j++) {
				this._elsv(ex.target[j], ex.func(j));
			}
		}
	},
	updateElements : function (then_update) {
		var i;
		for (i in this.elements) {
			this.elements[i] = this._collect(i);
		}
		for (i = 0; i < this.expressions.length; i++) {
			this.expressions[i].target = this.elements[this.expressions[i].varn];
		}
		if (['keypress', 'change'].contains(this.update_event)) {
			this._bind(this.update_event);
		}
		if (then_update) {
			this.update();
		}
		return this;
	}
}

