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
        if(!$('#diff-view').length) {
            $('#files').prepend(
            <div class="file" id="diff-view">
              <div class="data syntax">
                  <table cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="100%">
                        <div class="highlight">
                          <pre>compareing...</pre>
                        </div>
                      </td>
                    </tr>
                </table>
              </div>
            </div>.toXMLString());
        }
        $('#diff-view').hide();
        var selected = $('#revisions').find('input:checkbox:checked');
        var link = selected.map(function() { return this.value.replace(/(https?:\/\/gist\.github\.com\/)/, '$1raw/') });
        var desc = selected.map(function() { return $(this).parent().text().replace(/\s+/g, ' '); });
        with(D()) {
        parallel([
            xhttp.get(link[0])
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[1];
                var url = link[0].replace(/[^\/]*$/, r);
                return xhttp.get(url);
            })
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[2];
                var url = link[0].replace(/[^\/]*$/, r);
                return xhttp.get(url);
            })
            ,
            xhttp.get(link[1])
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[1];
                var url = link[1].replace(/[^\/]*$/, r);
                return xhttp.get(url);
            })
            .next(function(res) {
                var r = res.responseText.split(/\n/)[0].split(/\s/)[2];
                var url = link[1].replace(/[^\/]*$/, r);
                return xhttp.get(url);
            })
        ]).next(function (res) {
            var udiff = new UnifiedDiff(res[1].responseText, res[0].responseText, 3).toString();
            udiff = '--- ' + desc[1] + '\n' + '+++ ' + desc[0] + '\n' + udiff;
            if(udiff.split(/\n/).length < 5000) {
                udiff = udiff.replace(/^(\+.*)$/mg, '<span class="gd">$1</span>');
                udiff = udiff.replace(/^(\-.*)$/mg, '<span class="gi">$1</span>');
                udiff = udiff.replace(/^(\@.*)$/mg, '<span class="gu">$1</span>');
                udiff = udiff.replace(/^(.*)\n/mg, '<div class="line">$1</div>');
            }
            $('#diff-view pre').empty().append(udiff)
            $('#diff-view').slideDown('normal');
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
