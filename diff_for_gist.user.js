// ==UserScript==
// @name           Diff for gist.github
// @namespace      http://userscripts.org/users/40991
// @include        http://gist.github.com/*
// @include        https://gist.github.com/*
// @require        http://svn.coderepos.org/share/lang/javascript/jsdeferred/trunk/jsdeferred.userscript.js
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
            $('#files').prepend(
            <div class="file" id="diffView">
              <div class="data syntax">
                <table cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="100%">
                      <div class="highlight"><pre></pre></div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>.toXMLString()
            );
        }
        $('#diffView').hide();
        var selected = $('#revisions').find('input:checkbox:checked');
        var link = selected.map(function() { return this.value.replace(/(https?:\/\/[^/]+\/)/, '$1raw/') });
        var desc = selected.map(function() { return $(this).parent().text().replace(/\s+/g, ' '); });
        with(D()) {
        var fetch = function(url) {
            return xhttp.get(url)
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[1];
                return xhttp.get(url.replace(/[^\/]*$/, r));
            })
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[2];
                return xhttp.get(url.replace(/[^\/]*$/, r));
            });
        };
        parallel(
            [fetch(link[0]), fetch(link[1])]
        ).next(function (res) {
            var pre = $('#diffView pre');
            var udiff = new UnifiedDiff(res[1].responseText, res[0].responseText, 3).toString();
            udiff = '--- ' + desc[1] + '\n' + '+++ ' + desc[0] + '\n' + pre.text(udiff).html();
            if(udiff.split(/\n/).length < 5000) {
                udiff = udiff.replace(/^(\+.*)$/mg, '<span class="gd">$1</span>')
                             .replace(/^(\-.*)$/mg, '<span class="gi">$1</span>')
                             .replace(/^(\@.*)$/mg, '<span class="gu">$1</span>')
                             .replace(/^(.*)\n/mg, '<div class="line">$1</div>');
            }
            pre.html(udiff);
            $('#diffView').slideDown('normal');
        });
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
