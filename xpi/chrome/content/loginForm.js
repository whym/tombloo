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
    }, document.createDocumentFragment()), getElement('accept'));
  });
  this.button_accept = getElement('accept');
  this.button_cancel = getElement('cancel');
  this.accept_func = function(){ return self.accept() };
  this.cancel_func = function(){ return self.cancel() };
  this.connect();
}

LoginPanel.prototype = {
  login : function(){
    var self = this;
    var ds = {};
    // すべて終了後, Login Formを閉じるかどうかのflag
    var flag = true;
    // ひとつでもrequestを飛ばしたかどうかのflag
    var request = false;
    // formの情報をcollectして, emptyでないものに関してloginRequestを飛ばす
    items(self.forms).forEach(function([key, form]){
      var param = form.collect();
      if(param){
        request = true;
        ds[key] = form.poster.loginRequest(param);
      } else {
        // fieldがemptyのものに関してはRequestを飛ばさず, flagをfalseにしておく
        // 節約
        flag = false;
      }
    });
    var done_forms = [];
    // loginRequestの結果を待って, 成功しているものをdone_formsに格納.
    // this.formsから削除.
    return (request ? (new DeferredHash(ds)).addCallback(function(ress){
      items(ress).forEach(function([key, res]){
        var result = res[1];
        if(result){
          var form = self.forms[key];
          done_forms.push(form);
          delete self.forms[key];
        } else {
          // 失敗しているものがあればflagをfalseにしておく
          flag = false;
        }
      });
      // 成功したものに関して, postする
			return Tombloo.Service.post(self.ps, done_forms.map(function(form){
        return form.poster;
      }));
    }) : succeed()).addCallback(function(){
      // post終了後, flagにそってformの処理
      // formを閉じるとscriptが停止するのでpostが終わってから
      if(flag) self.finalize();
      else self.request(done_forms);
    });
  },
  accept: function(){
    this.disconnect();
    this.button_accept.disabled = true;
    this.button_cancel.disabled = true;
    return this.login();
  },
  cancel: function(){
    this.disconnect();
    window.close();
  },
  finalize: function(){
    window.close();
  },
  request: function(done_forms){
    var self = this;
    withDocument(document, function(){
      var base = self.element;
      // 削除前の高さ取得
      var before = base.boxObject.height;
      done_forms.forEach(function(form){
        form.remove();
      });
      // 削除後の高さ取得
      var after = base.boxObject.height;
      // windowの高さ調整
      window.resizeBy(0, (after - before));
      self.connect();
      self.button_accept.disabled = false;
      self.button_cancel.disabled = false;
    });
  },
  connect: function(){
    this.button_accept.addEventListener('click', this.accept_func, false);
    this.button_cancel.addEventListener('click', this.cancel_func, false);
  },
  disconnect: function(){
    this.button_accept.removeEventListener('click', this.accept_func, false);
    this.button_cancel.removeEventListener('click', this.cancel_func, false);
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
      if(memo){
        if(!(memo[key] = self[key].value)){
          memo = null;
        }
      }
      return memo;
    }, {});
  },
  remove: function(){
    this.element.parentNode.removeChild(this.element);
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

