// ==UserScript==
// @name           Diff for gist.github
// @description    adds a diff function to http://gist.github.com/
// @namespace      http://userscripts.org/users/40991
// @include        http://gist.github.com/*
// @include        https://gist.github.com/*
// @require        http://github.com/cho45/jsdeferred/raw/master/jsdeferred.userscript.js
// @require        http://gist.github.com/105908.txt
// ==/UserScript==

(function() {
  var $ = unsafeWindow.jQuery;
  var rev = $('#revisions li');
  if(!rev.length || rev.length == 1) return;
  
  rev.each(function() {
    var r = $(this);
    r.prepend(
      $('<input type="checkbox" />')
      .attr('name', 'diff')
      .val(r.find('.id').attr('href'))
      .bind('click', diffSelect)
    );
  });
  $('#revisions').append(
    $('<input type="button" />')
    .attr('name', 'diffExec')
    .attr('id', 'diffExec')
    .val('Compare')
    .bind('click', diffExec)
    .attr('disabled', 'disabled')
  );

  function diffSelect(e) {
    var me = e.target;
    var c = $('#revisions li input:checked');
    if(c.length > 2) c.each(function(i) { c[i].checked = (c[i] == me); });
    $('#diffExec').attr('disabled', (c.length != 2));
  }
  
  function diffExec() {
    if(!$('#diffView').length) $('#files').prepend('<div id="diffView"></div>');
    var diffView = $('#diffView');
    diffView.hide();
    var selected = $('#revisions').find('input:checkbox:checked');
    var link = selected.map(function() { return this.value.replace(/(https?:\/\/[^/]+\/)/, '$1raw/') });
    var desc = selected.map(function() { return $(this).parent().text().replace(/\s+/g, ' '); });
    var urlbase = link[0].slice(0, link[0].lastIndexOf('/') + 1)
    with(D()) {
    parallel(
      Array.map.call(this, link, function(url) {  // link is a jQuery object.
        return xhttp.get(url)
        .next(function(res) {
          var r = res.responseText.split(/\n/)[0].split(/\s/)[1];
          return xhttp.get(urlbase + r);
        });
      })
    ).next(function (res) {
      var data = res.map(function(r) {
        return r.responseText.split(/\n/).map(function(e) {
          var v = e.split(' ')[2].split("\t");
          return { hash: v[0], name: v[1] || '' };
        });
      });
      var diffQueue = [], diffHtml = [];
      var listChanged = (data[0].length != data[1].length);
      data[0].forEach(function(d0) {
        data[1].forEach(function(d1) {
          listChanged = listChanged || (d0.hash == d1.hash && d0.name != d1.name);
          if(d0.hash != d1.hash && d0.name == d1.name) diffQueue.push(d0, d1);
        });
      });
      if(listChanged) {
        var d = data.map(function(e) { return e.map(function(o) { return o.name }) });
        var diff = new Diff(d[1], d[0]);
        diff.a.shift(), diff.b.shift(), diff.lcs.shift();
        var messages = diff.lcs.map(function(n) {
          if(n > 0) {
            return '<p class="gi" style="padding:2px;">' + diff.b.shift() + ' added</p>';
          } else if(n < 0) {
            return '<p class="gd" style="padding:2px;">' + diff.a.shift() + ' removed</p>';
          } else {
            diff.a.shift(), diff.b.shift();
            return '';
          }
        });
        diffHtml.push('<div class="file"><div class="data syntax">' + messages.join('') + '</div></div>');
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
          if(udiff.split(/\n/).length < 5000) { // ignore if the diff is too big.
            udiff = udiff.replace(/^(.*)\n/mg, '<div class="line">$1</div>')
                         .replace(/">\+/mg, ' gi">+')
                         .replace(/">\-/mg, ' gd">-')
                         .replace(/">\@/mg, ' gu">@');
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
          diffHtml.push(format(contentB, contentA, 3, nameB, nameA));
        });
        
        diffView.html(diffHtml.join('') || '<div>No difference.</div>').slideDown('normal');
      });
    }).error(console.log)
    }
  }
})()
