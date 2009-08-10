// ==UserScript==
// @name           Diff for gist.github
// @namespace      http://userscripts.org/users/40991
// @include        http://gist.github.com/*
// @include        https://gist.github.com/*
// @require        http://github.com/cho45/jsdeferred/raw/986ebd69231919f0f3a261d8c33ae913e4b4dca8/jsdeferred.userscript.js
// @require        http://gist.github.com/105908.txt
// ==/UserScript==

(function() {
    var $ = unsafeWindow.jQuery;
    var rev = $('#revisions li');
    if(!rev.length || rev.length == 1) return;

    var diffSelect = function(e) {
        var me = e.target;
        var c = $('#revisions li input:checked');
        if(c.length > 2) 
            c.each(function(i) { if(c[i] != me) c[i].checked = false; });
        $('#diffExec').attr('disabled', (c.length != 2));
    };
    var diffExec = function() {
        if(!$('#diffView').length) {
            $('#files').prepend('<div id="diffView"></div>');
        }
        $('#diffView').hide();
        var selected = $('#revisions').find('input:checkbox:checked');
        var link = selected.map(function() { return this.value.replace(/(https?:\/\/[^/]+\/)/, '$1raw/') });
        var desc = selected.map(function() { return $(this).parent().text().replace(/\s+/g, ' '); });
        var urlbase = link[0].slice(0, link[0].lastIndexOf('/') + 1)
        with(D()) {
        var fetch = function(url) {
            return xhttp.get(url)
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[1];
                return xhttp.get(urlbase + r);
            });
        };
        parallel(
            [fetch(link[0]), fetch(link[1])]
        ).next(function (res) {
            var data = res.map(function(r) {
                return r.responseText.split(/\n/).map(function(e) {
                    var v = e.split(' ')[2].split("\t");
                    return { hash: v[0], name: v[1] || '' };
                });
            });
            var listChanged = (data[0].length != data[1].length);
            var diffQueue = [];
            data[0].forEach(function(d0) {
                data[1].forEach(function(d1) {
                    listChanged = listChanged || (d0.hash == d1.hash && d0.name != d1.name);
                    if(d0.hash != d1.hash && d0.name == d1.name) diffQueue.push(d0, d1);
                });
            });
            
            var diffhtml = [];
            if(listChanged) {
                var d = data.map(function(e) { return e.map(function(o) { return o.name }) });
                var diff = new Diff(d[1], d[0]);
                diff.a.shift(), diff.b.shift(), diff.lcs.shift();
                var messages = diff.lcs.reduce(function(m, n) {
                    if(n > 0) {
                        m += '<p class="gd" style="padding:2px;">' + diff.b.shift() + ' added</p>';
                    } else if(n < 0) {
                        m += '<p class="gi" style="padding:2px;">' + diff.a.shift() + ' removed</p>';
                    } else {
                        diff.a.shift(), diff.b.shift();
                    }
                    return m;
                }, '');
                diffhtml.push('<div class="file"><div class="data syntax">' + messages + '</div></div>');
            }
            
            parallel(
                diffQueue.map(function(e) {
                    return xhttp.get(urlbase + e.hash);
                })
            ).next(function(res) {
                var format = function(contentB, contentA, includeLines, nameB, nameA) {
                    this.pre = this.pre || $('<pre></pre>');
                    var udiff = new UnifiedDiff(contentB, contentA, includeLines).toString();
                    udiff = '--- ' + nameB + '\n' + '+++ ' + nameA + '\n' + this.pre.text(udiff).html();
                    if(udiff.split(/\n/).length < 5000) {
                        udiff = udiff.replace(/^(\+.*)$/mg, '<span class="gd">$1</span>')
                                     .replace(/^(\-.*)$/mg, '<span class="gi">$1</span>')
                                     .replace(/^(\@.*)$/mg, '<span class="gu">$1</span>')
                                     .replace(/^(.*)\n/mg, '<div class="line">$1</div>');
                    }
                    return '<div class="file"><div class="data syntax"><div class="highlight"><pre>'
                         + udiff 
                         + '</pre></div></div></div>';
                };
                
                diffQueue.forEach(function(e, i, a) {
                    if(i % 2 == 0) return;
                    var contentA = res[i - 1].responseText;
                    var contentB = res[i].responseText;
                    var nameA = desc[0] + ' ' + diffQueue[i - 1].name;
                    var nameB = desc[1] + ' ' + e.name;
                    diffhtml.push(format(contentB, contentA, 3, nameB, nameA));
                });
                
                var pre = $('#diffView');
                pre.html(diffhtml.join('') || '<div>No difference.</div>');
                $('#diffView').slideDown('normal');
            });
        }).error(console.log)
        }
        
    };
    $('#revisions').append(
        $('<input type="button" />')
        .attr('name', 'diffExec')
        .attr('id', 'diffExec')
        .val('Compare')
        .bind('click', diffExec)
        .attr('disabled', 'disabled')
    );
    rev.each(function() {
        var r = $(this);
        r.prepend(
            $('<input type="checkbox" />')
            .attr('name', 'diff')
            .val(r.find('.id').attr('href'))
            .bind('click', diffSelect)
        );
    });
})()
