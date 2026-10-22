/*
  This file is part of RelaxNGui.

  RelaxNGui is free software: you can redistribute it and/or modify it under
  the terms of the GNU General Public License as published by the Free Software
  Foundation, either version 3 of the License, or (at your option) any later
  version.

  RelaxNGui is distributed in the hope that it will be useful, but WITHOUT ANY
  WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
  A PARTICULAR PURPOSE. See the GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  RelaxNGui (file COPYING in the main directory).  If not, see
  <http://www.gnu.org/licenses/>.
*/

var RelaxNGui = function(rng,target,ceval,ignore=false,upload=true) {
  if (!(rng instanceof XMLDocument)) { // rng has to be XMLDocument //{{{
    rng = $XR($(rng).serializeXML());
  } //}}}

  var rec_lenextract = function(elements,lencount=0) { //{{{
    $.each(elements,function(k,v){
      var tag = $(v)[0];
      if ((tag.localName == 'element') && (tag.namespaceURI == 'http://relaxng.org/ns/structure/1.0')) {
        $(tag).children('attribute').each(function(l,w){
          let tmp = lenextract($(w)[0],lencount);
          if (tmp > lencount) { lencount = tmp; }
        });
        let tmp = lenextract(tag,lencount);
        if (tmp > lencount) { lencount = tmp; }
      }
      if ((tag.localName == 'optional') && (tag.namespaceURI == 'http://relaxng.org/ns/structure/1.0')) {
        let tmp = rec_lenextract(tag.children);
        if (tmp > lencount) { lencount = tmp; }
      }
    });
    return lencount;
  }; //}}}
  var lenextract = function(tag, lencount) { //{{{
    $.each(tag.attributes,function(k,v){
      if ((v.localName == 'label') && (v.namespaceURI == 'http://rngui.org')) {
        $('#relaxngui_ruler').text(v.nodeValue);
        lencount = $('#relaxngui_ruler')[0].getBoundingClientRect().width;
      }
      // if ((v.localName == 'label') && (v.namespaceURI == 'http://rngui.org')) { lencount = v.nodeValue.length > lencount ? v.nodeValue.length : lencount; }
      if ((v.localName == 'labellength') && (v.namespaceURI == 'http://rngui.org')) { lencount = parseInt(v.nodeValue); }
    });
    return lencount;
  }; //}}}

  var labextract = function(type,tag) { //{{{
    var ret = { 'type': type, 'wrap': false, 'readonly': false, 'label': '', default: '' };
    $.each(tag.attributes,function(k,v){
      if ((v.localName == 'label')       && (v.namespaceURI == 'http://rngui.org')) { ret['label']       = v.nodeValue; }
      if ((v.localName == 'readonly')    && (v.namespaceURI == 'http://rngui.org')) { ret['readonly']    = v.nodeValue == 'true' ? true : false; }
      if ((v.localName == 'wrap')        && (v.namespaceURI == 'http://rngui.org')) { ret['wrap']        = v.nodeValue == 'true' ? true : false; }
      if ((v.localName == 'filehandler') && (v.namespaceURI == 'http://rngui.org')) { ret['filehandler'] = v.nodeValue; ret['pattern'] = 'https:\/\/[^\s$.?#].[^\s]*'; }
    });
    $.each(tag.children,function(k,v){
      if ((v.localName == 'param') && (v.namespaceURI == 'http://relaxng.org/ns/structure/1.0')) {
        $.each(v.attributes,function(l,w){
          if ((w.localName == 'name') && (w.nodeValue == 'minInclusive')) {
            ret['min'] = v.lastChild.nodeValue;
          }
          if ((w.localName == 'name') && (w.nodeValue == 'maxInclusive')) {
            ret['max'] = v.lastChild.nodeValue;
          }
          if ((w.localName == 'name') && (w.nodeValue == 'pattern')) {
            ret['pattern'] = v.lastChild.nodeValue;
          }
        });
      }
    });
    return ret;
  }; //}}}

  var checkuniqueness = function(container,target) { //{{{
    let val = $(target).get_val();
    let eles = container.find('> .relaxngui_dyn > .relaxngui_table > .relaxngui_row > .relaxngui_cell[data-relaxngui-unique="true"]');
    let seen = false;
    eles.each((_,ele) => {
      if (target != ele && $(ele).get_val() == val) {
        seen = true;
      }
    });
    if (seen) {
      target.setCustomValidity('Name already used');
      $(target).addClass('invalid');
    } else {
      target.setCustomValidity('');
      $(target).removeClass('invalid');
    }
  }; //}}}

  var addelements = function(target,container,first) { //{{{
    var template = target.parent().find('> .relaxngui_template').clone(true,true);
    template.removeClass('relaxngui_template');

    // setting id for every row
    template.find('.relaxngui_row').not(template.find('.relaxngui_template .relaxngui_row')).each(function(){
      let row = $(this);

      let newid = Math.random().toString(36).slice(2);

      row.find('[id="_"]').attr('id', newid);
      row.find('[for="_"]').attr('for', newid);
      row.find('[name="_"]').attr('name', newid);
      row.find('[id^="_checkbox_"], [id="_file"], [id="_button"]').each(function(){ this.id = newid + this.id; });
      row.find('[for^="_checkbox_"]').each(function(){ this.setAttribute('for', newid + this.getAttribute('for')); });
    });

    template.find('[data-relaxngui-template]').each(function(j,t){
      $(t).attr('data-relaxngui-template',false);
    });
    template.find('.relaxngui_template [data-relaxngui-template]').each(function(j,t){
      $(t).attr('data-relaxngui-template',true);
    });
    template.addClass('relaxngui_dyn');
    template.on('click', '> [data-type=del]', function(ev){ delelements($(ev.target)); });
    template.find('> [data-type=mov]').movelements(template);

    if (container.find('> .relaxngui_dyn').length % 2 == 1) {
      var evens = template.find('.even');
      var odds = template.find('.odd');
      evens.each(function(k,v){
        $(v).removeClass('even');
        $(v).addClass('odd');
      });
      odds.each(function(k,v){
        $(v).removeClass('odd');
        $(v).addClass('even');
      });
    }

    container.find('> .relaxngui_control').before(template);
    if (first == false) {
      if (container.is("[data-relaxngui-onchange]")) {
        eval(container.attr('data-relaxngui-onchange'));
        container.trigger('relaxngui_change');
      }
    }
  }; //}}}

  var delelements = function(target) { //{{{
    var it = target.parent();
    var par = target.parent().parent();
    if (par.is("[data-relaxngui-onchange]")) {
      eval(par.attr('data-relaxngui-onchange'));
      par.trigger('relaxngui_change');
    }
    it.remove();
    par.trigger('relaxngui_remove');
  }; //}}}

  var recshow_header = function(tag,ret,level){ //{{{
    var header;
    var fold;
    $.each(tag.attributes,function(k,v){
      if ((v.localName == 'header') && (v.namespaceURI == 'http://rngui.org')) { header = v.nodeValue; }
      if ((v.localName == 'fold') && (v.namespaceURI == 'http://rngui.org')) { fold = v.nodeValue; }
    });
    if (header) {
      if (fold != undefined) {
        var xxx = $("<div data-relaxngui-level='" + level + "' class='relaxngui_header fold'>" + header + "</div>");
            xxx.prepend($("<span class='relaxngui_fold'></span>"));
        ret.append(xxx);
        if (fold == 'closed' || fold == 'closed_conditional') {
          ret.addClass('closed');
        }
        if (fold == 'closed_conditional') {
          ret.addClass(fold);
        }
      } else {
        ret.append($("<div data-relaxngui-level='" + level + "' class='relaxngui_header'>" + header + "</div>"));
      }
    }
    return fold;
  } //}}}

  var recshow_data = function(node,defaul,tpath,datalist,second,template,path,optional,id) { //{{{
    if (defaul && typeof defaul == 'string' && defaul.match(/^javascript:/)) {
      defaul = defaul.replace(/^javascript:/,'');
      defaul = ceval ? ceval(defaul) : eval(defaul);
    }
    var os = (optional ? " onkeyup='var sl = $(this).siblings(\"label\"); if ($(this).get_val() == \"\") { if (!sl.hasClass(\"optional\")) { sl.addClass(\"optional\") } } else { sl.removeClass(\"optional\") }' data-optional='true'" : " data-optional='false'");
    if (second.readonly)
      node.append($("<input      data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'                                                                              title='" + (second.label != '' ? second.label : '') + "'                            id='" + id + "' readonly='readonly'" + os + "></input>"));
    else {
      if (second.type == 'string') {
        if (second.filehandler) {
          node.append($("<input type='file' style='display:none' id='" + id + "file'></input>"));
          if (upload) {
            node.append($("<button class='file' title='" + (second.label != '' ? second.label : '') + "' id='" + id + "button'><i style='font-size: 1.8em;' class='uidash-icon-folder-open'></i></button>"));
          }
          node.append($("<input  data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'                                                                              title='" + (second.label != '' ? second.label : '') + "'                            id='" + id + "' placeholder='" + second.label + "'" + (second.pattern != undefined ? (" pattern='" + second.pattern + "'") : '') + " data-relaxngui-lax-pattern='true' " + os + "></input>"));
        } else {
          node.append($("<input  data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'                                                                              title='" + (second.label != '' ? second.label : '') + "'                            id='" + id + "' placeholder='" + second.label + "'" + (second.pattern != undefined ? (" pattern='" + second.pattern + "'") : '') + os + "></input>"));
        }
      } else if (second.type == 'integer') {
        node.append($("<input    data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'     pattern='([\\+\\-]?[0-9]+)|(^!.*)'                                       title='" + (second.label != '' ? second.label : 'integer number') + "'              id='" + id + "' placeholder='" + second.label + "'" + (second.min != undefined ? (" min='" + second.min + "'") : '') + (second.max != undefined ? (" max='" + second.max + "'") : '') + os + "></input>"));
      } else if (second.type == 'positiveInteger') {
        if (second.min == undefined) second.min = 1;
        node.append($("<input    data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'     pattern='([\\+]?[1-9]+[0-9]*)|(^!.*)'                                    title='" + (second.label != '' ? second.label : 'positive integer number') + "'     id='" + id + "' placeholder='" + second.label + "'" + (second.min != undefined ? (" min='" + second.min + "'") : '') + (second.max != undefined ? (" max='" + second.max + "'") : '') + os + "></input>"));
      } else if (second.type == 'nonNegativeInteger') {
        if (second.min == undefined) second.min = 0;
        node.append($("<input    data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'     pattern='([\\+]?[0-9]+)|(^!.*)'                                          title='" + (second.label != '' ? second.label : 'non-negative integer number') + "' id='" + id + "' placeholder='" + second.label + "'" + (second.min != undefined ? (" min='" + second.min + "'") : '') + (second.max != undefined ? (" max='" + second.max + "'") : '') + os + "></input>"));
      } else if (second.type == 'date') {
        node.append($("<input    data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'     pattern='([0-9]{4}-(0[1-9]|1[012])-(0[1-9]|1[0-9]|2[0-9]|3[01]))|(^!.*)' title='" + (second.label != '' ? second.label : 'date') + "'                        id='" + id + "' placeholder='" + second.label + "'" + os + "></input>"));
      } else if (second.type == 'float') {
        node.append($("<input    data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'     pattern='([\\+\\-]?[0-9]+([.][0-9]*)?|[.][0-9]+)|(^!.*)'                 title='" + (second.label != '' ? second.label : 'decimal number') + "'              id='" + id + "' placeholder='" + second.label + "'" + (second.min != undefined ? (" min='" + second.min + "'") : '') + (second.max != undefined ? (" max='" + second.max + "'") : '') + os + "></input>"));;
      } else if (second.type == 'bool') {
        node.append($("<input    data-relaxngui-visible='true'                                                                  " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='checkbox'                                                                          title='" + (second.label != '' ? second.label : 'boolean') + "'                     id='" + id + "' placeholder='" + second.label + "'" + os + "></input>"));
      } else if (second.type == 'color') {
        let tnode = $("<div class='relaxngui_cell relaxngui_color_container'/>");
        tnode.append("<span class='round none'><input data-relaxngui-visible='true' data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' type='radio' name='" + id + "' value='' id='" + id + "checkbox_none'/><label for='" + id + "checkbox_none'></label></span>");
        $.each(datalist,function(didx,dname){
          tnode.append("<span class='round'><input data-relaxngui-visible='true' data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' type='radio' name='" + id + "' value='" + dname[0] + "' id='" + id + "checkbox_" + didx + "'/><label for='" + id + "checkbox_" + didx + "' style='color: " + dname[0] + ";'></label></span>");
        });
        node.append(tnode);
      } else if (second.type == 'text') {
        node.append($("<ol      data-relaxngui-visible='true' contenteditable='true' data-relaxngui-wrap='" + second.wrap + "' " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + " data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell'                                                                                          title='" + (second.label != '' ? second.label : '') + "'                            id='" + id + "' placeholder='" + second.label + "'" + os + "><li></li></ol>"));
      } else if (second.type == 'datalist') {
        var tnode = $("<select   data-relaxngui-visible='true' " + (defaul && typeof defaul == 'string' ? 'value="' + defaul + '"' : '') + "                                                                  data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell'                                                                                          title='" + (second.label != '' ? second.label : '') + "'                            id='" + id + "' size='1'" + os + "></select>");
        $.each(datalist,function(didx,dname){
          if (dname[1] == defaul)
            tnode.append('<option value="' + dname[1] + '" selected="selected">' + dname[0] + '</value>');
          else
            tnode.append('<option value="' + dname[1] + '">' + dname[0] + '</value>');
        });
        node.append(tnode);
      } else {
        node.append($("<input    data-relaxngui-visible='true' value=''                                                                                                                                        data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + tpath + "' class='relaxngui_cell' type='text'                                                                             title='" + (second.label != '' ? second.label : '') + "'                            id='" + id + "' readonly='readonly'" + os + "></input>"));
      }
    }
  }; //}}}

  var recshow_single = function(tag,ret,template,template_child,path,lencount,optional){ //{{{
    var node = $('<div class="relaxngui_row"/>');
    var first = { name: null, label: null, labeltype: '', default: null, visible: true, functional: true, onchange: null, oninit: null, hint: null, unique: false };
    var second = {};
    var datalist = [];
    var retcount = 0;
    $.each(tag.attributes,function(k,v){
      if  (v.localName == 'name')                                                  { first.name       = v.nodeValue.replace(/:/,'\\:'); }
      if ((v.localName == 'label')      && (v.namespaceURI == 'http://rngui.org')) { first.label      = v.nodeValue; }
      if ((v.localName == 'labeltype')  && (v.namespaceURI == 'http://rngui.org')) { first.labeltype  = v.nodeValue; }
      if ((v.localName == 'default')    && (v.namespaceURI == 'http://rngui.org')) { first.default    = v.nodeValue; }
      if ((v.localName == 'visible')    && (v.namespaceURI == 'http://rngui.org')) { first.visible    = v.nodeValue == 'false' ? false : true; }
      if ((v.localName == 'onchange')   && (v.namespaceURI == 'http://rngui.org')) { first.onchange   = v.nodeValue; }
      if ((v.localName == 'oninit')     && (v.namespaceURI == 'http://rngui.org')) { first.oninit     = v.nodeValue; }
      if ((v.localName == 'hint')       && (v.namespaceURI == 'http://rngui.org')) { first.hint       = v.nodeValue; }
    });

    $.each($(tag).children('anyName'), function(k,v) {
      if (v.hasAttributeNS('http://rngui.org','unique') && v.getAttributeNS('http://rngui.org','unique') == 'true') {
        first.unique = true;
      }
    });
    $.each($(tag).children('data[type=string]'), function(k,v) { second = labextract('string',v); });
    $.each($(tag).children('data[type=integer]'), function(k,v) { second = labextract('integer',v); });
    $.each($(tag).children('data[type=nonNegativeInteger]'), function(k,v) { second = labextract('nonNegativeInteger',v); });
    $.each($(tag).children('data[type=positiveInteger]'), function(k,v) { second = labextract('positiveInteger',v); });
    $.each($(tag).children('data[type=float]'), function(k,v) { second = labextract('float',v); });
    $.each($(tag).children('data[type=date]'), function(k,v) { second = labextract('date',v); });
    $.each($(tag).children('data[type=boolean]'), function(k,v) { second = labextract('bool',v); });
    $.each($(tag).children('text'), function(k,v) { second = labextract('text',v); });
    $.each($(tag).children('attribute[name=rngui-nonfunctional]'), function(k,v) { first.functional = false });
    $.each($(tag).children('choice, data[type=string] > choice'), function(k,v) {
      second = labextract('datalist',v);
      if (v.hasAttributeNS('http://rngui.org','href') && v.hasAttributeNS('http://rngui.org','extract')) {
        let href_url = v.getAttributeNS('http://rngui.org','href');
        if (href_url && typeof href_url == 'string' && href_url.match(/^javascript:/)) {
          href_url = href_url.replace(/^javascript:/,'');
          href_url = ceval ? ceval(href_url) : eval(href_url);
        }

        $.ajax({
          url: href_url,
          async: false,
          success: function(data) {
            var res = eval(v.getAttributeNS('http://rngui.org','extract'));
            $.each(res,function(i,n){
              datalist.push(n);
            });
          }
        });
      }
      if (v.hasAttributeNS('http://rngui.org','type')) {
        let t = v.getAttributeNS('http://rngui.org','type');
        if (typeof t == 'string' && t == 'color') {
          second.type = 'color';
        }
      }
      $.each($(v).children('value'), function(k,v) {
        datalist.push([v.hasAttributeNS('http://rngui.org','label') ? v.getAttributeNS('http://rngui.org','label') : v.textContent,v.textContent]);
      });
    });

    ret.attr('data-relaxngui-visible',first.visible);
    ret.attr('data-relaxngui-functional',first.functional);
    if (first.onchange) {
      ret.attr('data-relaxngui-onchange',first.onchange);
    }
    if (first.oninit) {
      ret.attr('data-relaxngui-oninit',first.oninit);
    }
    if (second.filehandler) {
      ret.attr('data-relaxngui-filehandler',second.filehandler);
    }

    let labid = template_child ? '_' : Math.random().toString(36).slice(2); // templates have empty ids, ids are later added in addelements

    if (first.name && first.label) {
      node.append($("<label class='relaxngui_cell" + (optional && first.default == null && first.visible ? " optional": "") + "' style='min-width: " + lencount + "px' for='" + labid + "'>" + first.label + "</label><span class='relaxngui_cell'><i class='uidash-icon-value'></i></span>"));
    } else if (first.name) {
      // a tag without information is ignored
      node.addClass('relaxngui_hidden');
    } else if (first.label) {
      if (first.labeltype == 'xml') {
        node.append($("<input data-relaxngui-visible='true' data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + path + " > *[data-name]' class='relaxngui_cell' type='text' pattern='^[a-zA-Z_][a-zA-Z0-9_\\-]*$' placeholder='" + first.label + "'" + (first.unique ? " data-relaxngui-unique='true'" : '') + "></input><span class='relaxngui_cell'><i class='uidash-icon-value'></i></span>"));
      } else {
        node.append($("<input data-relaxngui-visible='true' data-relaxngui-template='" + template + "' data-relaxngui-parent='" + path + "' data-relaxngui-path='" + path + " > *[data-name]' class='relaxngui_cell' type='text' pattern='^[a-z_][a-zA-Z0-9_]*$'       placeholder='" + first.label + "'" + (first.unique ? " data-relaxngui-unique='true'" : '') + "></input><span class='relaxngui_cell'><i class='uidash-icon-value'></i></span>"));
      }
    }

    var tpath = (first.name ? (tag.localName == 'element' ? path + ' > ' + first.name : path + '[' + first.name + ']') : path + ' > *' );
    if (first.label) {
      recshow_data(node,first.default,tpath,datalist,second,template,path,optional,labid);
      ret.append(node);
      retcount += 1;
    } else {
      if (tag.localName != 'element') { // its an attribute, simulate its empty-ness
        node.attr('data-relaxngui-template',template);
        node.attr('data-relaxngui-parent',path);
        node.attr('data-relaxngui-path',tpath);
        ret.append(node);
        retcount += 1;
      }
    }
    if (first.hint) {
      var n  = $('<div class="relaxngui_hint"/>');
      var s1 = $('<em>Hint: </em>');
      var s2 = $('<span/>');
          s2.text(first.hint);

      n.append(s1);
      n.append(s2);
      ret.append(n);
      retcount += 1;
    }
    return retcount;
  } //}}}

  var recshow = function(elements,template,template_child,path,attr) { //{{{
    if (template) { template_child = true; }

    // delete all elements with relaxngui:ignore
    if (attr.ignore) {
      var tele = $.grep(elements,function(tagv){
        var include = true;
        $.each(tagv.attributes,function(k,v){
          if ((v.localName == 'ignore') && (v.namespaceURI == 'http://rngui.org')) {
            include = false;
          }
        });
        return include;
      });
      elements = $(tele);
    }

    var ret = $('<div/>');

    var lencount = rec_lenextract(elements,attr.optional ? attr.lencount : 0);
    $.each(elements,function(k,v){
      var tag = $(v)[0];
      if ((tag.localName == 'element') && (tag.namespaceURI == 'http://relaxng.org/ns/structure/1.0')) {
        if (attr.mode == 'even') { attr.mode = 'odd' } else { attr.mode = 'even'; }

        var xxx;
        if (template) {
          var yyy = $('<div data-relaxngui-level="' + attr.level + '" class="relaxngui_table ' + attr.mode + '" data-relaxngui-template="true" data-relaxngui-parent="' + path + '" data-relaxngui-path="' + (path == '' ? ' > '  + (typeof elements.attr('name') === 'undefined' ? '*' : elements.attr('name')) : path + ' > ' + (typeof $(tag).attr('name') === 'undefined' ? '*' : $(tag).attr('name'))) + '[data-main]">');
          xxx = $('<div class="relaxngui_template"><div data-type="del">✖</div><div data-type="mov"><div>⬍</div></div></div>');
          xxx.append(yyy);
          ret.append(xxx);
          xxx = yyy;
        } else {
          if ($(tag).children().length == 0) {
            if (attr.mode == 'even') { attr.mode = 'odd' }
            else { attr.mode = 'even'; }
            xxx = $('<div data-relaxngui-level="' + attr.level + '" class="relaxngui_hidden relaxngui_table ' + attr.mode + '" data-relaxngui-template="false" data-relaxngui-parent="' + path + '" data-relaxngui-path="' + (path == '' ? ' > '  + elements.attr('name') : path + ' > ' + $(tag).attr('name')) + '[data-main]">');
          } else {
            xxx = $('<div data-relaxngui-level="' + attr.level + '" class="relaxngui_table ' + attr.mode + '" data-relaxngui-template="false" data-relaxngui-parent="' + path + '" data-relaxngui-path="' + (path == '' ? ' > '  + elements.attr('name') : path + ' > ' + $(tag).attr('name')) + '[data-main]">');
          }
          ret.append(xxx);
        }
        if (tag.attributes['ns']){
          xxx.attr('data-relaxngui-ns',tag.attributes['ns'].nodeValue);
        }

        recshow_header(tag,xxx,attr.level);
        var rcount = 0;
        $(tag).children('attribute:not([name=rngui-nonfunctional])').each(function(l,w){
          var ttag = $(w)[0];
          rcount += recshow_single(ttag,xxx,template,template_child,path + ' > ' + $(tag).attr('name'),lencount,attr.optional ? true : false);
        });
        rcount += recshow_single(tag,xxx,template,template_child,path,lencount,attr.optional ? true : false);

        var sub;
        if (sub = recshow($(tag).children('element, zeroOrMore, optional'),false,template_child,path + ' > ' + $(tag).attr('name'),{ ignore: attr.ignore, mode: (attr.mode == 'even' && rcount % 2 == 0 ? 'odd' : 'even' ), level: attr.level + 1 })) {
          var inode = xxx.append(sub);
          if (template) {
            inode.find('[data-relaxngui-template]').each(function(j,t){
              $(t).attr('data-relaxngui-template',true);
            });
          }
        }
      } else if ((tag.localName == 'zeroOrMore') && (tag.namespaceURI == 'http://relaxng.org/ns/structure/1.0')) {
        if (attr.mode == 'even') { attr.mode = 'odd' } else { attr.mode = 'even'; }

        var label;
        $.each(tag.attributes,function(k,v){
          if ((v.localName == 'label') && (v.namespaceURI == 'http://rngui.org')) { label = v.nodeValue; }
        });
        var but = $('<button class="relaxngui_control">' + label + '</button>');
            but.on('click',function(ev){ addelements($(ev.target),$(ev.target).parent(),false); });

        ret.append(recshow($(tag).children(),true,template_child,path,{ ignore: attr.ignore, mode: attr.mode, level: attr.level }));
        ret.append(but);
      } else if ((tag.localName == 'optional') && (tag.namespaceURI == 'http://relaxng.org/ns/structure/1.0')) {
        if (attr.mode == 'even') { attr.mode = 'odd' } else { attr.mode = 'even'; }

        ret.append(recshow($(tag).children('element, zeroOrMore'),false,template_child,path,{ ignore: attr.ignore, mode: (attr.mode == 'even' ? 'odd' : 'even'), optional: true, level: attr.level + 1, lencount: lencount }));
      }
      $(tag).children().each((_,ele) => {
        if ((ele.localName == 'script') && (ele.namespaceURI == 'http://rngui.org')) {
          let scr = $('<script/>');
              scr.text($(ele).text());
          ret.append(scr);
        }
      });
    });
    return ret.children().length > 0 ? ret.children() : undefined;
  }; //}}}

  var rec_xml2json = function(node) { //{{{
    var obj = {};
    $.each(node.attributes || [],function(i,attr){
      if (attr.name == 'xmlns' || attr.name.match(/^xmlns:/)) {
        return;
      }
      obj['@' + attr.name] = attr.value;
    });
    if ($(node).contents().length == 0) { return null; }
    var text = '';
    $(node).contents().each(function(){
      if (this.nodeType == 3) { // text node
        text += this.nodeValue;
      } else if (this.nodeType == 1) { // element node
        var name = this.localName;
        var child = rec_xml2json(this);
        if (obj[name] === undefined) {
          obj[name] = child;
        } else {
          if (!Array.isArray(obj[name])) {
            obj[name] = [obj[name]];
          }
          obj[name].push(child);
        }
      }
    });
    text = text.trim();
    if (text != '') {
      if (Object.keys(obj).length == 0) {
        return text;
      }
      obj['#text'] = text;
    }
    return obj;
  }; //}}}

  this.save_raw = function() { //{{{
    var xml;
    var curr;
    var tar = target.find('[data-relaxngui-path][data-relaxngui-visible=true]:not([data-relaxngui-template=true])').filter(function(){
      return $(this).parents('[data-relaxngui-visible=false]').length == 0;
    });
    if (tar.length == 0) { // when empty, no xml set
      let root = rng.documentElement;
      let name = root.getAttribute('name');
      let ns = root.getAttribute('ns');
      if (name) {
        xml = $XR('<' + name + (ns ? ' xmlns="' + ns + '"' : '') + '/>');
      }
    }
    for (var i = 0; i<tar.length;) {
      var path = $(tar[i]).attr('data-relaxngui-path');
      var parent_path = $(tar[i]).attr('data-relaxngui-parent');
      var parent_ns = $(tar[i]).attr('data-relaxngui-ns');
      if (i == 0) {
        var par = path.replace(/\[data-main\]/,'').replace(/ > /,'');
        if (typeof parent_ns !== 'undefined' && parent_ns != undefined && parent_ns != null && parent_ns != '') {
          xml = $XR('<' + par + ' xmlns="' + parent_ns + '"/>');
        } else {
          xml = $XR('<' + par + '/>');
        }
      } else {
        var ma = path.match(/([^\s]+)$/)[1];
        var att;
        if (ma.match(/\*\[data-main\]/)) {
          // do nothing. seriously. explicitly.
        } else if (ma.match(/\[data-main\]/)) {
          var par = ma.replace(/\[data-main\]/,'');
          var pp = $(parent_path,xml);
          parent_ns = pp[0].namespaceURI;
          let exp = '';
          if ($(tar[i]).attr('data-relaxngui-functional') == 'false') {
            exp = ' rngui-nonfunctional="true"';
          }

          if (typeof parent_ns !== 'undefined' && parent_ns != undefined && parent_ns != null && parent_ns != '') {
            var curr = $($XR('<' + par + ' xmlns="' + parent_ns + '"' + exp + '/>').documentElement);
          } else {
            var curr = $($XR('<' + par + exp + '/>').documentElement);
          }
          pp.last().append(curr);
        } else if (ma.match(/\[data-name\]/)) {
          if ($(tar[i]).get_val() && tar[i].checkValidity()) {
            var pp = $(parent_path,xml);
            parent_ns = pp[0].namespaceURI;
            if (typeof parent_ns !== 'undefined' && parent_ns != undefined && parent_ns != null && parent_ns != '') {
              var nn =  $($XR('<' + $(tar[i]).get_val() + ' xmlns="' + parent_ns + '"/>').documentElement).text($(tar[i+1]).get_val());
            } else {
              var nn =  $($XR('<' + $(tar[i]).get_val() + '/>').documentElement).text($(tar[i+1]).get_val());
            }
            $(parent_path,xml).append(nn);
          }
          i+=1;
        } else if (att = ma.match(/\[([^\]]+)\]$/)) {
          att[1] = att[1].replace(/\\/,'');
          $(parent_path + ':last-child',xml).last().attr(att[1],$(tar[i]).get_val());
        } else {
          if ($(tar[i]).attr('data-optional') == 'true' && $(tar[i]).get_val() == '') {
            $(path + ':last-child',xml).last().remove();
          } else {
            $(path + ':last-child',xml).last().text($(tar[i]).get_val())
          }
        }
      }
      i+=1;
    }
    $('*',xml).each((i,ele) => {
      if (ele.parentNode) {
        if (ele.parentNode.namespaceURI == ele.namespaceURI) {
          ele.removeAttribute('xmlns');
        }
      }
    });
    return xml;
  }; //}}}
  this.save = function() { //{{{
    return self.save_raw();
  } //}}}
  this.save_text = function() { //{{{
    return $(self.save()).serializePrettyXML();
  } //}}}
  this.save_json = function() { //{{{
    return JSON.stringify(self.save_object(),null,2);
  } //}}}
  this.save_object = function() { //{{{
    return rec_xml2json(self.save().documentElement) || {};
  } //}}}

  var suspend_events = false;
  this.content = function(data) { //{{{
    suspend_events = true;
    if (!(data instanceof XMLDocument)) { // data has to be XMLDocument //{{{
      data = $XR($(data).serializeXML());
    } //}}}

    if (data) {
      var x = $(data).serializePrettyXML();
      x = x.replace(/<\?[^>]+>/g, "");
      x = x.trim();
      y = $(self.save()).serializePrettyXML();
      if (x != y) {
        console.info('RelaxnGUI: XML changed.');
        target.find('.relaxngui_dyn').remove();
        target.find('[data-relaxngui-path]').each(function(k,pa){
          var path = $(pa).attr('data-relaxngui-path');
          if (!path.match(/data-\w+\]$/)) {
            if ($(pa).attr('data-relaxngui-template') == 'true' && path.match(/\*$/)) {
              $(data).find(path).each(function(index,ele){
                $(target.find('[data-relaxngui-path="' + path + '[data-name]"][data-relaxngui-template="false"]').get(index)).set_val(ele.localName);
                $(target.find('[data-relaxngui-path="' + path + '"][data-relaxngui-template="false"]').get(index)).set_val($(ele).text());
              });
            } else if ($(pa).attr('data-relaxngui-template') == 'true' && !path.match(/\*$/)) {
              $(data).find(path).each(function(index,ele){
                var att;
                var val;
                if (att = path.match(/(.*)\[([^\]]+)\]$/)) {
                  val = $(ele).attr(att[2]);
                } else {
                  val = $(ele).text();
                }
                if (val && val != '') {
                  $(target.find('[data-relaxngui-path="' + path + '"][data-relaxngui-template="false"]').get(index)).set_val(val);
                }
              });
            } else {
              var att;
              var val;
              if (att = path.match(/(.*)\[([^\]]+)\]$/)) {
                val = $(data).find(att[1]).attr(att[2]);
              } else {
                val = $(data).find(path).text();
              }
              if (val && val != '') {
                var t = target.find('[data-relaxngui-path="' + path + '"]');
                t.set_val(val);
                if (t.attr('data-optional') == 'true') {
                  t.siblings('label').removeClass('optional');
                }
              }
            }
          } else {
            if ($(pa).attr('data-relaxngui-template') == 'true') {
              var but = target.find('.relaxngui_table[data-relaxngui-template="false"] > .relaxngui_template > [data-relaxngui-path="' + path + '"][data-relaxngui-template="true"]').parent().parent().find('> button');
              if (but.length > 0) {
                var dpath = path.replace(/\[data-main\]$/,'');
                var par = undefined;
                var ind = -1;
                $(data).find(dpath).each(function(ke,ele){
                  if (par != $(ele).parent()[0]) {
                    ind += 1;
                    par = $(ele).parent()[0];
                  }
                  if ($(but.get(ind)).attr('disabled')) {
                    $(but.get(ind)).removeAttr('disabled');
                    addelements($(but.get(ind)),$(but.get(ind)).parent(),true);
                    $(but.get(ind)).attr('disabled','disabled');
                  } else {
                    addelements($(but.get(ind)),$(but.get(ind)).parent(),true);
                  }
                });
              }
            }
          }
        });
        self.set_checkpoint();
      }
      target.find('.relaxngui_table.closed_conditional').each(function(k,e) {
        $(e).find('input:not([readonly]), [contenteditable]:not([readonly])').each(function(l,f) {
          if ($(f).get_val() != '') {
            $(e).removeClass('closed');
          }
        });
      });

      $('[data-relaxngui-oninit]',target).each((i,ele) => {
        let ev = $(ele).attr('data-relaxngui-oninit');
        relaxngui_init_target = $(ele).attr('data-relaxngui-path').replace(/\[data-main\]/,'');
        eval(ev);
      });
    }
    suspend_events = false;
  }; //}}}

  (function($) { //{{{
    $.fn.movelements = function(item) {
      var item = item;
      var pos;

      this.on("mousedown", function(e) {
        item.addClass('moveable');
        pos = e.originalEvent.clientY;
        $(document).one("mouseup", function(e) {
          item.removeClass('moveable');
          e.preventDefault();
          item.trigger('relaxngui_move');
        });
        e.preventDefault();
      });

      $(document).on("mousemove", function(e) {
        if (!item.hasClass('moveable'))
          return;

        var prev = item.prev('.relaxngui_dyn');
        var next = item.next('.relaxngui_dyn');

        if (prev.length > 0 && e.originalEvent.clientY < prev.offset().top + prev.outerHeight()) {
          $(prev).before($(item));
          pos = e.originalEvent.clientY;
        } else if (next.length > 0 && e.originalEvent.clientY > next.offset().top) {
          $(next).after($(item));
          pos = e.originalEvent.clientY;
        }

        e.preventDefault();
      });
    }
  })(jQuery); //}}}

  // stuff to determine if user changed something
  var orig = '';
  this.set_checkpoint = function() { //{{{
    orig = self.save_text();
  } //}}}
  this.has_changed = function() { //{{{
    if (orig != self.save_text()) {
      return true;
    } else {
      return false;
    }
  } //}}}

  if ($('#relaxngui_ruler').length == 0) {
    $('body').prepend($('<span id="relaxngui_ruler" style="position: absolute; visibility: hidden; white-space: nowrap;"></span>'));
  }

  target.append(recshow($(rng.documentElement),false,false,'',{ ignore: ignore, mode: 'even', level: 0}));

  var self = this;

  var relaxngui_init_target;
  this.relaxngui_visible = function(what,...args) { //{{{
    let curval = $('[data-relaxngui-path="' + relaxngui_init_target + '"]',target).get_val();
    if (what == curval) {
      args.forEach((arg, i) => {
        arg = ' ' + arg.trim() + '[data-main]';
        let par = $('[data-relaxngui-path="' + arg + '"]',target);
        par.attr('data-relaxngui-visible','true');
      });
    }
  } //}}}
  this.relaxngui_hidden = function(what,...args) { //{{{
    let curval = $('[data-relaxngui-path="' + relaxngui_init_target + '"]',target).get_val();
    if (what == curval) {
      args.forEach((arg, i) => {
        arg = ' ' + arg.trim() + '[data-main]';
        let par = $('[data-relaxngui-path="' + arg + '"]',target);
        par.attr('data-relaxngui-visible','false');
      });
    }
  } //}}}

  this.relaxngui_switch_visibility = function(what,val,...args) { //{{{
    let curval = what.get_val();
    if (val == curval) {
      args.forEach((arg, i) => {
        arg = ' ' + arg.trim() + '[data-main]';
        let par = $('[data-relaxngui-path="' + arg + '"]',target);
        par.attr('data-relaxngui-visible','true');
      });
    } else {
      args.forEach((arg, i) => {
        arg = ' ' + arg.trim() + '[data-main]';
        let par = $('[data-relaxngui-path="' + arg + '"]',target);
        par.attr('data-relaxngui-visible','false');
      });
    }
  } //}}}
  this.relaxngui_hide = function(what,val,...args) { //{{{
    let curval = what.get_val();
    if (val == curval) {
      args.forEach((arg, i) => {
        arg = ' ' + arg.trim() + '[data-main]';
        let par = $('[data-relaxngui-path="' + arg + '"]',target);
        par.attr('data-relaxngui-visible','false');
      });
    }
  } //}}}
  this.relaxngui_show = function(what,val,...args) { //{{{
    let curval = what.get_val();
    if (val == curval) {
      args.forEach((arg, i) => {
        arg = ' ' + arg.trim() + '[data-main]';
        let par = $('[data-relaxngui-path="' + arg + '"]',target);
        par.attr('data-relaxngui-visible','true');
      });
    }
  } //}}}

  this.relaxngui_toggle = function(...args) { //{{{
    args.forEach((arg, i) => {
      arg = ' ' + arg.trim() + '[data-main]';
      let par = $('[data-relaxngui-path="' + arg + '"]',target);
      let vis = par.attr('data-relaxngui-visible');
      if (vis == 'true') {
        par.attr('data-relaxngui-visible','false');
      } else {
        par.attr('data-relaxngui-visible','true');
      }
    });
  }; //}}}

  // always bind on with custom postfix
  // always unbind before bind, to not have pile up the binds, expecially because we redo Relaxngui every time something has changed

  target.unbind('click.relaxngui');
  target.on('click.relaxngui','.relaxngui_header.fold',function(){
    $(this).parent().toggleClass('closed');
  });

  var lastval;
  target.unbind('keydown.relaxngui');
  target.on('keydown.relaxngui','input[pattern]',function(ev){
    let input = $(this);
    lastval = input.val();
  });

  target.unbind('input.relaxngui.force');
  target.on('input.relaxngui.force','input[pattern]:not([data-relaxngui-lax-pattern])',function(ev){
    let input = $(this);
    let pattern = new RegExp(input.attr('pattern'));
    if (!(input.val() == '') && !pattern.test(input.val())) {
      input.val(lastval);
    }
  });
  target.unbind('input.relaxngui.noforce');
  target.on('input.relaxngui.noforce','input[pattern][data-relaxngui-lax-pattern]',function(ev){
    let target = this;
    let input = $(target);
    let pattern = new RegExp(input.attr('pattern'));
    if (!(input.val() == '') && !pattern.test(input.val())) {
      target.setCustomValidity('Invalid pattern');
      input.addClass('invalid');
    } else {
      target.setCustomValidity('');
      input.removeClass('invalid');
    }
  });

  target.unbind('input.relaxngui.unique');
  target.on('input.relaxngui.unique','[data-relaxngui-unique="true"]',function(ev){
    checkuniqueness($(ev.currentTarget).closest('.relaxngui_dyn').parent(),this);
  });

  target.unbind('click.file.button');
  target.on('click.file.button','button.file',function(ev){
    let id = ev.currentTarget.id.replace(/_button/,'');
    document.getElementById(id + '_file').click();
  });

  target.unbind('change.file');
  target.on('change.file','input:file',function(ev){
    let id = ev.currentTarget.id.replace(/_file/,'');
    if (typeof window.FileReader !== 'function') {
      alert('FileReader not yet supportet');
      return;
    }
    let file = document.getElementById(id + '_file').files[0];
    let content = new FileReader();
    content.onload = function(){
      let current_element = $(ev.currentTarget);
      let res = eval(current_element.parents('[data-relaxngui-filehandler]').attr('data-relaxngui-filehandler'));
      $(document.getElementById(id)).val(res);
      target.trigger('relaxngui_change');
    }
    content.onerror = function(){ }
    content.onabort = function(){ }
    content.readAsArrayBuffer(file);
  });

  target.unbind('input.relaxngui.radio');
  target.on('input.relaxngui.radio','input:radio',function(ev){
    if (suspend_events) return;
    let pp = $(ev.currentTarget).attr('data-relaxngui-path') + '[data-main]';
    let current_element = $(ev.currentTarget);
    let current_element_main = $('[data-relaxngui-path="' + pp + '"]',target);
    if (current_element_main.is("[data-relaxngui-onchange]")) {
      eval(current_element_main.attr('data-relaxngui-onchange'));
    }
    target.trigger('relaxngui_change');
  });

  target.unbind('change.relaxngui');
  target.on('change.relaxngui','select',function(ev){
    if (suspend_events) return;
    let pp = $(ev.currentTarget).attr('data-relaxngui-path') + '[data-main]';
    let current_element = $(ev.currentTarget);
    let current_element_main = $('[data-relaxngui-path="' + pp + '"]',target);
    if (current_element_main.is("[data-relaxngui-onchange]")) {
      eval(current_element_main.attr('data-relaxngui-onchange'));
    }
    target.trigger('relaxngui_change');
  });
  target.unbind('blur.relaxngui');
  target.on('blur.relaxngui','input, textarea, [contenteditable]',function(ev){
    if (suspend_events) return;
    let pp = $(ev.currentTarget).attr('data-relaxngui-path') + '[data-main]';
    let current_element = $(ev.currentTarget);
    let current_element_main = $('[data-relaxngui-path="' + pp + '"]',target);
    if (current_element_main.is("[data-relaxngui-onchange]")) {
      eval(current_element_main.attr('data-relaxngui-onchange'));
    }
    target.trigger('relaxngui_change');
  });
  target.unbind('keypress.relaxngui');
  target.on('keypress.relaxngui','input',function(ev){
    if (suspend_events) return;
    if (ev.keyCode == 13) {
      let pp = $(ev.currentTarget).attr('data-relaxngui-path') + '[data-main]';
      let current_element = $(ev.currentTarget);
      let current_element_main = $('[data-relaxngui-path="' + pp + '"]',target);
      if (current_element_main.is("[data-relaxngui-onchange]")) {
        eval(current_element_main.attr('data-relaxngui-onchange'));
      }
      target.trigger('relaxngui_change');
    }
  });

  // edit fix for contenteditable
  target.unbind('input.relaxngui.ol');
  target.on('input.relaxngui.ol', 'ol[contenteditable]', function (e) {
    $(e.target).parent().find('> br').remove();
    let sel = window.getSelection();
    if (sel.rangeCount == 0) return;
    let r = sel.getRangeAt(0);
    if (r.collapsed && r.startContainer === this) {
      let lastLi = $(this).children('li').last();
      if (lastLi.length) {
        let nr = document.createRange();
        nr.selectNodeContents(lastLi.get(0));
        nr.collapse(false);
        sel.removeAllRanges();
        sel.addRange(nr);
      }
    }
  });

  target.unbind('copy.relaxngui.div');
  target.on('copy.relaxngui.div', 'div[contenteditable]', function (e) {
    e = e.originalEvent;
    var selectedText = window.getSelection();
    var range = selectedText.getRangeAt(0);
    var selectedTextReplacement = range.toString()
    e.clipboardData.setData('text/plain', selectedTextReplacement);
    e.preventDefault(); // default behaviour is to copy any selected text
  });
  target.unbind('copy.relaxngui.ol');
  target.on('copy.relaxngui.ol', 'ol[contenteditable]', function (e) {
    e = e.originalEvent;
    let selectedText = window.getSelection();
    let range = selectedText.getRangeAt(0);
    let con = range.cloneContents();
    let n = document.createElement("ol");
    var selectedTextReplacement = $(n).append(con).get_val();
    e.clipboardData.setData('text/plain', selectedTextReplacement);
    e.preventDefault(); // default behaviour is to copy any selected text
  });

  // Paste fix for contenteditable
  target.unbind('paste.relaxngui.div');
  target.on('paste.relaxngui.div', 'div[contenteditable]', function (e) {
    e.preventDefault();
    if (e.originalEvent.clipboardData) {
      content = (e.originalEvent || e).clipboardData.getData('text/plain');
      document.execCommand('insertText', false, content);
    }
  });
  target.unbind('keydown.relaxngui.ol.undo');
  target.on('keydown.relaxngui.ol.undo', 'ol[contenteditable]', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 'z') {
      let ol = $(this);
      let history = ol.attr('data-previous');
      if (history !== undefined && history !== '') {
        e.preventDefault();
        ol.html(history);
        ol.attr('data-previous', '');
      }
    }
  });
  target.unbind('paste.relaxngui.ol');
  target.on('paste.relaxngui.ol', 'ol[contenteditable]', function (e) {
    e.preventDefault();
    if (e.originalEvent.clipboardData) {
      content = (e.originalEvent || e).clipboardData.getData('text/plain');
      // document.execCommand('insertText', false, content);
      if (window.getSelection) {
        $(this).attr('data-previous', $(this).html());
        var selObj = window.getSelection();
        var selRange = selObj.getRangeAt(0);
        let startLi = $(selRange.startContainer.nodeType == 3 ? selRange.startContainer.parentNode : selRange.startContainer).closest('li');
        let endLi = $(selRange.endContainer.nodeType == 3 ? selRange.endContainer.parentNode : selRange.endContainer).closest('li');
        selRange.deleteContents();
        let t = content.split(/\r?\n/);
        let anchor = null;
        let container = null;
        if (t.length > 0) {
          let ft = t.shift();
          let textNode = document.createTextNode(ft);
          selRange.insertNode(textNode);
          container = $(textNode).parent();
          if (container.is('ol')) {
            let prevLi = $(textNode).prev();
            if (prevLi.length && prevLi.is('li')) {
              prevLi.append(textNode);
              anchor = prevLi;
            } else {
              let li = $("<li></li>");
              let s = ft.replace(/ /g,'');
              if (s.length != 0) {
                li.text(ft);
              } else {
                li.html($('<br>'));
              }
              textNode.parentNode.replaceChild(li.get(0), textNode);
              anchor = li;
            }
          } else {
            anchor = container.is('li') ? container : container.closest('li');
          }
        }
        t.forEach((l) => {
          let n = $("<li></li>");
          let s = l.replace(/ /g,'');
          if (s.length != 0) {
            n.text(l);
          } else {
            n.html($('<br>'));
          }
          if (anchor && anchor.length) {
            anchor.after(n);
          } else {
            container.append(n);
          }
          anchor = n;
        });
        if (endLi.length && endLi.get(0) !== startLi.get(0) && anchor && anchor.length) {
          anchor.append(endLi.contents());
          endLi.remove();
        }
        selObj.collapseToStart();
      }
    }
  });
};
