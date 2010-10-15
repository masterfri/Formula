/**
	Formula 
	The simple calculation tool	
	version 1.1
	
	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; version 2 of the License.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
*/

// Несколько полезных функций
// Проверка наличия элементов в массиве
Array.prototype.contains = function (elem) {
	var i;
	for (i = 0; i < this.length; i++) {
		if (this[i] == elem) return 1;
	}
	return 0;
}
// Сумма элементов массива
Array.prototype.sum = function() {
	var i, sum = 0;
	for (i = 0; i < this.length; i++) {
		sum += this[i];
	}
	return sum;
}
// Произведение элементов массива
Array.prototype.product = function() {
	var i, prod = 1;
	for (i = 0; i < this.length; i++) {
		prod *= this[i];
	}
	return prod;
}
// Нахождение максимального элемента массива
Array.prototype.max = function() {
	var i, max = this[0] || 0;
	for (i = 1; i < this.length; i++) {
		if (max < this[i]) {
			max = this[i];
		}
	}
	return max;
}
// Нахождение минимального элемента массива
Array.prototype.min = function() {
	var i, min = this[0] || 0;
	for (i = 1; i < this.length; i++) {
		if (min > this[i]) {
			min = this[i];
		}
	}
	return min;
}
// Алиасы
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

const DO_MANUAL = 1;
const DO_KEYPRESS = 2;
const DO_CHANGE = 3;

// Определение класса Expression
Formula_Expression = function (varn, expr) {
	this.varn = varn;
	this.target = null;
	this.expr = expr;
	this.func = null;
}

// Определение класса Fromula
Formula = function (form, conf) {
	if (typeof form == 'string') {
		form = document.getElementById(form);
	}
	if (! form) {
		alert('Form required!');
		throw new Exception('Form required!');
	}
	conf = conf || {};
	this.form = form;			// форма
	this.elements = {};		// элементы формы
	this.expressions = {};	// выражения
	this._expressions = []; // массив ссылок на выражения
	this.rules = {};			// правила
	this.depend = {};			// зависимости
	this.update_list = [];	// список элементов для обновления
	this.update_event = conf['update'] || DO_MANUAL;		// событие для пересчета
	this.check_event = conf['check'] || DO_MANUAL;		// событие для проверки
	this.wellform = conf['wellform'] ? true : false;	// дополнительное форматирование
	this.err_handler = conf['err_handler'] || this._def_err_handler; // обработчик ошибок формы
	if (conf['autoload']) {
		this._autoload();
	}
}

Formula.prototype = {
	// добавление выражения
	addExpr : function (varn, expr) {
		return this.setExpr(varn, expr);
	},
	// Загрузка формул и правил из атрибутов элементов
	_autoload : function () {
		var i, el, attr;
		for (i = 0; i < this.form.elements.length; i++) {
			el = this.form.elements[i];
			attr = el.getAttribute('expr');
			if (attr) {
				this.addExpr(this._eln(el), attr);
			}
			attr = el.getAttribute('rule');
			if (attr) {
				this.setRule(this._eln(el), attr);
			}
		}
		this.compile().update();
	},
	// добавление событий
	_bind : function () {
		if (DO_MANUAL == this.update_event && DO_MANUAL == this.check_event) {
			return;
		}
		var i, el, nam, __T = this;
		var kp = function() {__T._event(this, DO_KEYPRESS);};
		var ch = function() {__T._event(this, DO_CHANGE);};
		for (i = 0; i < this.form.elements.length; i++) {
			el = this.form.elements[i];
			nam = this._eln(el);
			if (this.depend[nam] || this.rules[nam]) {
				// если от элемента зависят другие элементы 
				// или на нем висит правило то вешаем на него события
				if (DO_KEYPRESS == this.update_event && this.depend[nam]) {
					el.onkeyup = kp;
				} else if (DO_KEYPRESS == this.check_event && this.rules[nam]) {
					el.onkeyup = kp;
				} else {
					el.onkeyup = null;
				}
				if (DO_CHANGE == this.update_event && this.depend[nam]) {
					el.onchange = ch;
				} else if (DO_CHANGE == this.check_event && this.rules[nam]) {
					el.onchange = ch;
				} else {
					el.onchange = null;
				}
			} else {
				el.onkeyup = null;
				el.onchange = null;
			}
		}
	},
	// проверка зависимости переменной var1 от var2
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
	// сбор элементов формы
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
	// сбор данных формы
	collectData : function (urlencode, elem) {
		if (! elem) elem = this.form.elements;
		var data = {}, el, nam, n;
		for (i = 0; i < elem.length; i++) {
			el = elem[i];
			// пропускаем неотмеченные чекбоксы и радио
			if (( el.type == 'checkbox' || el.type == 'radio') && !el.checked) continue;
			// собираем элементы для мультиселекта
			if (el.type == 'select-multiple') {
				nam = el.name.replace('[]', '');
				for (n = 0; n < el.options.length; n++) {
					if (el.options[n].selected) {
						data[nam + '[' + n + ']'] = el.options[n].value;
					}
				}
			} else {
				// чтобы не затирать дублирующиеся элементы задаем индексы
				nam = el.name.replace('[]', '[' + i + ']');
				data[nam] = el.value;
			}
		}
		// кодируем в строку если надо
		if (urlencode) {
			var str = '';
			for (i in data) {
				str += '&' + encodeURIComponent(i) + '=' + encodeURIComponent(data[i]);
			}
			return str.replace(/^&/, '');
		}
		return data;
	},
	// компиляция выражений
	compile : function () {
		var i, ex, vars, code, j, k, el, dep, __T = this;
		this.elements = {};
		this.depend = {}
		for (i = 0; i < this._expressions.length; i++) {
			ex = this._expressions[i];
			// собираем элементы
			if (! this.elements[ex.varn]) {
				this.elements[ex.varn] = this._collect(ex.varn);
			}
			ex.target = this.elements[ex.varn];
			// проверяем, есть ли переменные в выражении 
			vars = ex.expr.match(/\$([a-z0-9_]+)/ig);
			if (vars) {
				// заменяем переменные на функции доступа к значениям элементов
				// $$VAR => __T._gva("VAR") и $VAR => __T._gv(__P,"VAR") 
				code = ex.expr.replace(/\$\$([a-z0-9_]+)/ig, '__T._gva("$1")')
							  .replace(/\$([a-z0-9_]+)/ig, '__T._gv(__P,"$1")');
				for (j = 0; j < vars.length; j++) {
					el = vars[j].replace(/^\$\$?/, '');
					// строим список зависимостей
					if (! this.depend[el]) {
						this.depend[el] = [];
						this.depend[el].push(ex);
					} else if (! this._checkDepend(el, ex.varn)) {
						this.depend[el].push(ex);
					}
					// собираем зависимые елементы
					if (! this.elements[el]) {
						this.elements[el] = this._collect(el);
					}
				}
			}
			// создаем функцию
			try {
				ex.func = eval('(function(__P){return (' + code + ');})');
			} catch (e) {
				alert(e);
			}
		}
		// вешаем события
		this._bind();
		// пересчитываем значения
		this.update();
		return this;
	},
	// обработчик ошибок форм по умолчанию
	_def_err_handler : function (err, el) {
		if ('' == err) return;
		alert(el.name + ' has errors!');
	},
	// удаление всех выражений
	deleteAllExpr : function () {
		this.expressions = {};
		this._expressions = [];
		this.depend = {};
	},
	// удаление выражения
	deleteExpr : function (varn) {
		delete this.expressions[varn];
		var i;
		this._expressions = [];
		for (i in this.expressions) {
			this._expressions.push(this.expressions[i]);
		}
		return this;
	},
	// нормализация имени элемента
	_eln : function (el) {
		return el.name.replace('[]','')
	},
	// присвоение значения элементу
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
			   	// дополнительное форматирование
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
	// получние значения элемента
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
	// обработка событий
	_event : function (targ, type) {
		var nam = this._eln(targ);
		if (this.check_event == type && this.rules[nam]) {
			if (! this.validate([targ])) {
				return false;
			}
		}
		if (this.update_event == type && this.depend[nam]) {
			this._partialUpdate(targ);
		}
	},
	// получение элементов формы по имени
	getElements : function (nam) {
		if (typeof nam == 'string') {
			return this.elements[nam];
		}
		var i, j, r = [], e;
		for (i = 0; i < nam.length; i++) {
			e = this.elements[nam[i]];
			if (! e) continue;
			for (j = 0; j < e.length; j++) {
				r.push(e[j]);
			}
		}
		return r;
	},
	// получение выражения для элемента
	_getExpr : function (varn) {
		return this.expressions[varn];
	},
	// получение значения переменной
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
	// получение значения переменной как массива
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
	// частичное обновление
	_partialUpdate : function (obj) {
		var varn = this._eln(obj);
		this.update_list = [];
		this._queueUpdate(this._eln(obj), 20);
		this._update();
	},
	// добавление в очередь обновлений
	_queueUpdate : function (varn, deepth) {
		if (deepth <= 0) return;
		var i, dep = this.depend[varn];
		if (dep) {
			for (i = 0; i < dep.length; i++) {
				// добавление в очередь всех зависимых элементов
				if (!this.update_list.contains(dep[i])) {
					this.update_list.push(dep[i]);
					this._queueUpdate(dep[i].varn, deepth - 1);
				}
			}
		}
	},
	// Создание выражения
	setExpr : function (varn, expr) {
		this.expressions[varn] = {
			'varn' : varn,
			'target' : null,
			'expr' : expr,
			'func' : null
		};
		this._expressions.push(this.expressions[varn]);
		return this;
	},
	// создание правила
	setRule : function (varn, rule) {
		this.rules[varn] = typeof rule == 'string' ? eval('(' + rule + ')') : rule;
		return this;
	},
	// проверка значения элемента
	_test : function (ru, val, op, el) {
		var last = '', i = 0, k, res;
		while (i < ru.length){
			res = '';
			k = ru[i++];
			switch (k) {
				case 'noempty':if (val == '') res = k; break;
				case 'empty':	if (val != '') res = k; break;
				case 'minlen':	if (val.length < ru[i++]) res = k; break;
				case 'maxlen':	if (val.length > ru[i++]) res = k; break;
				case 'min':		if (val < ru[i++]) res = k; break;
				case 'max':		if (val > ru[i++]) res = k; break;
				case 'gt':		if (val <= ru[i++]) res = k; break;
				case 'lt':		if (val >= ru[i++]) res = k; break;
				case 'eq':		if (val != ru[i++]) res = k; break;
				case 'neq':		if (val == ru[i++]) res = k; break;
				case 'numeric':if (!val.match(/^[0-9]+$/)) res = k; break;
				case 'email':	if (!val.match(/^(([A-Za-z0-9]+_+)|([A-Za-z0-9]+\-+)|([A-Za-z0-9]+\.+)|([A-Za-z0-9]+\++))*[A-Za-z0-9]+@((\w+\-+)|(\w+\.))*\w{1,63}\.[a-zA-Z]{2,6}$/)) res = k; break;
				case 'login':	if (!val.match(/^([A-Za-z0-9]+[\._-])*[A-Za-z0-9]+$/)) res = k; break;
				case 'ereg':	if (!val.match(new RegExp(ru[i++]))) res = k; break;
				case 'or': 		res = this._test(ru[i++], val, 'or', el); break;
				case 'and':		res = this._test(ru[i++], val, 'and', el); break;
				case 'confirm': if (val != this.form[ru[i++]].value) res = k; break;
				case 'depend':	res = this._test(ru[i+1], this.form[ru[i]].value, 'and', el); i+=2; break;
				case 'not': 	if (this._test(ru[i++], val, 'and', el) == '') res = k; break;
				case 'fn':		res = this._testfun(val, el, ru[i++]); break;
			}
			if (op == 'or' && res == '') return '';
			if (op == 'and' && res != '') return res;
			last = res;
		}
		return last;
	},
	// проверка значений пользовательской функцией
	_testfun : function(val, el, fn) {
		var k, res;
		if (typeof fn == 'function') return fn(val, el);
		for (k in fn) {
			res = fn[k](val, el);
			if (res != '') return res;
		}
		return '';
	},
	// полное обновление
	update : function () {
		this.update_list = this._expressions;
		this._update();
		return this;
	},
	// обновление
	_update : function () {
		var i, j, ex;
		for (i = 0; i < this.update_list.length; i++) {
			ex = this.update_list[i];
			for (j = 0; j < ex.target.length; j++) {
				this._elsv(ex.target[j], ex.func(j));
			}
		}
	},
	// обновление списка элементов
	updateElements : function (then_update) {
		var i, ex;
		for (i in this.elements) {
			this.elements[i] = this._collect(i);
		}
		for (i = 0; i < this._expressions.length; i++) {
			ex = this._expressions[i];
			ex.target = this.elements[ex.varn];
		}
		// вешаем события
		this._bind();
		if (then_update) {
			// пересчитываем значения, если надо
			this.update();
		}
		return this;
	},
	// проверка значений формы
	validate : function(elem) {
		if (! elem) elem = this.form.elements;
		var valid = true;
		var i, el, rule, nam, err;
		for (i = 0; i < elem.length; i++) {
			el = elem[i];
			if (typeof el == 'string') {
				// проверка элементов по имени
				if (this.elements[el]) {
					valid = this.validate(this.elements[el]) && valid;
				}
			} else {
				nam = this._eln(el);
				if (this.rules[nam]) {
					// проверяем значение элемента
					err = this._test(this.rules[nam], this._elv(el), 'and', el);
					// если пустая строка - ошибок нет
					if ('' != err) valid = false;
					this.err_handler(err, el);
				}
			}
		}
		return valid;
	}
}

