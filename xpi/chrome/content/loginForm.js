// connectされるオブジェクト(signalを送る方)は必ずunload時にdisconnectAllをしてオブサーバーをクリアする
// ----[utility]-------------------------------------------------
'BOX VBOX HBOX SPACER LABEL TEXTBOX IMAGE DESCRIPTION TOOLTIP BUTTON GROUPBOX CAPTION'.split(' ').forEach(function(tag){
	this[tag] = bind(E, null, tag.toLowerCase());
});

function getElement(id){
	return (typeof(id) == 'string')? document.getElementById(id) : id;
}

// ----[LoginPanel]-------------------------------------------------
function LoginPanel(ps, posters){
  var self = this;
  this.forms = {};
  this.ps = ps;
  withDocument(document, function(){
    self.element = getElement('base');
    self.element.insertBefore(posters.reduce(function(df, poster){
      var form = new LoginForm(poster);
      df.appendChild(form.element);
      self.forms[poster.name] = form;
      return df;
    }, document.createDocumentFragment()), getElement('spacer'));
  });
  this.button_accept = getElement('accept');
  this.button_cancel = getElement('cancel');
  this.button_accept.addEventListener('click', function(){ self.accept() }, false);
  this.button_cancel.addEventListener('click', function(){ self.cancel() }, false);
}

LoginPanel.prototype = {
  login : function(){
    var self = this;
    var ds = {};
    items(self.forms).forEach(function([key, form]){
      ds[key] = form.poster.loginRequest(form.collect());
    });
    var forms = [];
    var flag = true;
    return (new DeferredHash(ds)).addCallback(function(ress){
      items(ress).forEach(function([key, res]){
        var result = res[1];
        if(result){
          var form = self.forms[key];
          forms.push(form);
          delete self.forms[key];
        } else {
          flag = false;
        }
      });
    }).addCallback(function(){
			return Tombloo.Service.post(self.ps, forms.map(function(form){
        return form.poster;
      }));
    }).addCallback(function(){
      if(flag) self.finalize();
      else self.request(forms);
    });
  },
  accept: function(){
    this.button_accept.disabled = true;
    this.button_cancel.disabled = true;
    return this.login();
  },
  cancel: function(){
    window.close();
  },
  finalize: function(){
    window.close();
  },
  request: function(forms){
    var all_height = forms.reduce(function(memo, form){
      var height = form.remove();
      return memo + (height-0);
    }, 0);
    this.element.height = (this.element.height - all_height);
    this.button_accept.disabled = false;
    this.button_cancel.disabled = false;
  }
}

// ----[LoginForm]-------------------------------------------------
function LoginForm(poster){
  var self = this;
  this.poster = poster;
  this.element = GROUPBOX({
    class : 'form-box'
  }, [
    CAPTION({
      class : 'caption'
      },[
      IMAGE({
        class : 'poster button',
        src   : poster.ICON
      }),
      LABEL({value:poster.name}),
    ]),
    this.paramsParser()
  ]);
}

LoginForm.prototype = {
  paramsParser: function(){
    var self = this;
    return items(this.poster.loginParams).reduce(function(df, [key, val]){
      var elm = LoginForm.paramsParserTable[val].call(self, key);
      df.appendChild(elm);
      return df;
    }, document.createDocumentFragment());
  },
  collect: function(){
    var self = this;
    return keys(this.poster.loginParams).reduce(function(memo, key){
      memo[key] = self[key].value;
      return memo;
    }, {});
  },
  remove: function(){
    var height = this.element.height;
    this.element.parentNode.removeChild(this.element);
    return height;
  }
}

LoginForm.paramsParserTable = {
  'text': function(key){
    return HBOX({
      class: 'form-entry',
      },[
      LABEL({
        value: key,
        class: 'form-label',
      }),
      (this[key] = TEXTBOX({
        class: 'form-text',
        type:'autocomplete',
      })),
    ]);
  },
  'pass': function(key){
    return HBOX({
      class: 'form-entry',
      }, [
      LABEL({
        value: key,
        class: 'form-label',
      }),
      (this[key] = TEXTBOX({
        class: 'form-pass',
        type:'password',
      })),
    ]);
  }
}
