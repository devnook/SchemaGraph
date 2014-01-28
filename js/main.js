



$(document).ready(function(){
  var google = new actSbx.Google();

  $('#search').click(function() {
    google.search($('#search-term').val())
  });



  $('#fetch').click(function() {
    var url = $('#provider-url').val();
    google.crawl(url);
  });

    // Set up email content editor.
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: {name: "htmlmixed"},
    tabMode: "indent",
    lineNumbers: true
  });
  editor.setValue('Paste html markup here')
  editor.on('focus', function() {
    if (editor.getValue() === 'Paste html markup here') {
        editor.setValue('');
    }
  });
  editor.on('blur', function() {
      if (editor.getValue() === '') {
          editor.setValue('Paste html markup here');
      }
  });





});




var actSbx = {};

actSbx.Google = function() {
  this.url = null;
  this.jsonLd = null;
  this.entities = null;
  this.index = [];
};

// Dummy implementation for now. Assumes jsonLd in first script.
actSbx.Google.prototype.parseHtml = function(htmlString) {
  var dom = $.parseHTML(htmlString);
  for (var i = 0, node; node = dom[i]; i++) {
    if (node.nodeName == 'SCRIPT') {
      var script = node;
    }
  }
  console.log(dom)
  console.log(script)
  if (script) {
    return obj = JSON.parse(script.innerHTML);
  }
};

actSbx.Google.supportedEntityTypes = [
  'Movie',
  'MusicRecording',
  'Restaurant'
];

actSbx.Google.supportedActionHandlerTypes = [
  'WebPageHandler',
  'HttpHandler'
];

actSbx.Google.findEntitiesWithOperations = function(key, jsonObj, parent) {
    console.log(parent)
    if (key === 'operation') {
      console.log('OPERATIONS')
      console.log(parent['@id'])

    }
    if( typeof jsonObj == "object" ) {
        console.log(key)
        $.each(jsonObj, function(k,v) {
            // k is either an array index or object key
            actSbx.Google.findEntitiesWithOperations(k, v, jsonObj);
        });
    }
    else {
        console.log(key + ': ' + jsonObj)
    }
}



actSbx.Google.snippetTpl = '<div><a href="{{id}}">{{name}}</a>' +
  '<p>Sample snippet here bla bla bkla</p>' +
  '<p><span class="action-widget"></span></p>';


actSbx.Google.prototype.crawl = function(url) {
  var G = this;

  //todo: encode
  var url = location.origin + '/fetch?url=' + url;

  $.get(url, function(response) {
    var responseObj = JSON.parse(response);
    console.log(response)
    G.entities = responseObj['entities'];

    $('#log').text(JSON.stringify(G.entities, undefined, 2));
    $('#validation-errors').text(responseObj['errors'])

    // Structured Data entities.
    var el = $('#entities');

    console.log(responseObj['entities_with_operations'])
    if (responseObj['entities_with_operations']) {
      $.each(responseObj['entities_with_operations'], function(id, entityId) {
        entity = G.entities[entityId]


        var view = {
          name: entity.name,
          id: entity['@id']
        };
        console.log(entity)
        var output = Mustache.render(actSbx.Google.snippetTpl, view);
        el.append($(output))

        var operation = G.entities[entity.operation['@id']]
        var handler = G.entities[operation.actionHandler['@id']]
        console.log(operation)

        var rateAction = new actSbx.RateActionWidget(entity, operation, handler);
        rateAction.render($('.action-widget'));

        rateAction.eventEmitter.on('action-call', function(e, status, url, data) {
          $('#provider-log').append($('<p><span class="status ' + status + '">' + status + '</span> ' + url + ' <span class="params">' + data + '</span></p>'));
        });



      })
    }
  })
};




actSbx.ActionWidget = function(url, method) {
  this.url = url;
  this.method = method;
  this.eventEmitter = $('<span></span>');
};

actSbx.RateActionWidget = function(entity, operation, handler) {
  console.log(handler)

  actSbx.ActionWidget.call(this, entity['@id'], handler.httpMethod);

  this.operation_ = operation;
  this.handler_ = handler;
  this.button_ = null;
};

actSbx.RateActionWidget.prototype = new actSbx.ActionWidget();

actSbx.RateActionWidget.prototype.render = function(parent) {
  this.button_ = $('<button class="action-link">Rate</button>');
  parent.append(this.button_);
  this.log_ = $('<p class="log"></p>');
  parent.append(this.log_);
  var self = this;
  this.button_.on('click', $.proxy(this.popup, this));
};

actSbx.RateActionWidget.prototype.popup = function() {
  // Seems there might be multiple action handlers.
  this.popup_ = $('<div class="popup"><p>' + this.handler_.name  +
    '</p><p><select><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></p><p><a href="#" class="btn cancel">cancel</a></p></div>');
  $('body').append(this.popup_);
  var self = this;
  this.popup_.find('.cancel').on('click', function() {
    self.popup_.remove();
    return false;
  });
  this.popup_.find('select').change( function() {
    var config = {
      type: self.method,
      data: {'value': $(this).val()},
      complete: function(e) {
        //alert('Action was complated');
        if (e.status === 200) {
          self.button_.text('Rated sucessfully!');
          self.button_.addClass('btn-success');
        } else {
          self.button_.text('Action unsuccessful:(');
          self.button_.addClass('btn-danger');
        }
        var msg = e.status + ' ' + e.statusText + ': ' + this.url;
        console.log(this)
        //self.eventEmitter.trigger('action-call', [e.status + ' ' + e.statusText, this.url, this.data])
        self.log_.append($('<p><span class="status ' + e.status + '">' +
            e.status + ' ' + e.statusText + '</span> ' + this.url +
            ' <span class="params">' + this.data + '</span></p>' +
            '<p>Debug: curl --data-urlencode "' + this.data + '" ' + this.url + '</p>'));
        self.popup_.remove();
      }
    }
    // What is the name of the param?
    // What about multiple ratings?
    $.ajax(self.url, config);
    self.popup_.remove();
    return false;
  });
};









