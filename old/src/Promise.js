/*
 *  Copyright 2012 (c) Pierre Duquesne <stackp@online.fr>
 *  Licensed under the New BSD License.
 *  https://github.com/stackp/promisejs
 */

(function(exports) {

    function bind(func, context) {
        return function() {
            return func.apply(context, arguments);
        };
    }

    function Promise() {
        this._callbacks = [];
    }

    // NCASE EDIT: SO IT'S THENABLE
    // You're Mising the Point of Promises - https://gist.github.com/3889970
    // Wait... there's already a chain function...
    // Crap.
    // Nah, their chain is fucking WEIRD.

    Promise.prototype.then = function(func, context) {

        var promise = new Promise();

        var f = bind(func, context);
        var callback = function(result, error){
            var nextPromise = f(result, error);
            if(nextPromise){
                nextPromise.then(function(result, error){
                    promise.done(result, error);
                });
            }else{
                promise.done(result, error);
            }
        };

        if (this._isdone) {
            callback(this.result,this.error);
        } else {
            this._callbacks.push(callback);
        }

        return promise;

    };

    Promise.prototype.done = function(result, error) {

        this._isdone = true;
        this.error = error;
        this.result = result;
        for (var i = 0; i < this._callbacks.length; i++) {
            this._callbacks[i](result, error);
        }
        this._callbacks = [];

        return this;

    };

    function join(funcs) {
        var numfuncs = funcs.length;
        var numdone = 0;
        var p = new Promise();
        var errors = [];
        var results = [];

        function notifier(i) {
            return function(result, error) {
                numdone += 1;
                errors[i] = error;
                results[i] = result;
                if (numdone === numfuncs) {
                    p.done(results,errors);
                }
            };
        }

        for (var i = 0; i < numfuncs; i++) {
            funcs[i]().then(notifier(i));
        }

        return p;
    }

    function chain(funcs, result, error) {
        var p = new Promise();
        if (funcs.length === 0) {
            p.done(result, error);
        } else {
            funcs[0](result, error).then(function(res, err) {
                funcs.splice(0, 1);
                chain(funcs, res, err).then(function(r, e) {
                    p.done(r, e);
                });
            });
        }
        return p;
    }

    /*
     * AJAX requests
     */

    function _encode(data) {
        var result = "";
        if (typeof data === "string") {
            result = data;
        } else {
            var e = encodeURIComponent;
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    result += '&' + e(k) + '=' + e(data[k]);
                }
            }
        }
        return result;
    }

    function new_xhr() {
        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }
        return xhr;
    }

    function ajax(method, url, data, headers) {
        var p = new Promise();
        var xhr, payload;
        data = data || {};
        headers = headers || {};

        try {
            xhr = new_xhr();
        } catch (e) {
            p.done("",-1);
            return p;
        }

        payload = _encode(data);
        if (method === 'GET' && payload) {
            url += '?' + payload;
            payload = null;
        }

        xhr.open(method, url);
        xhr.setRequestHeader('Content-type',
                             'application/x-www-form-urlencoded');
        for (var h in headers) {
            if (headers.hasOwnProperty(h)) {
                xhr.setRequestHeader(h, headers[h]);
            }
        }

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    p.done(xhr.responseText,null);
                } else {
                    p.done("",xhr.status);
                }
            }
        };

        xhr.send(payload);
        return p;
    }

    function _ajaxer(method) {
        return function(url, data, headers) {
            return ajax(method, url, data, headers);
        };
    }

    var promise = {
        Promise: Promise,
        join: join,
        chain: chain,
        ajax: ajax,
        get: _ajaxer('GET'),
        post: _ajaxer('POST'),
        put: _ajaxer('PUT'),
        del: _ajaxer('DELETE')
    };

    if (typeof define === 'function' && define.amd) {
        /* AMD support */
        define(function() {
            return promise;
        });
    } else {
        exports.promise = promise;
        exports.Promise = Promise; // Global scope aw yiss
    }

})(this);
