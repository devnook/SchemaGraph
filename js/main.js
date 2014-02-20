



$(document).ready(function(){
  var google = new actSbx.Google();

  $('#raw-results').hide();

  $('#parse').click(function() {
    var url = location.origin + '/parse';

    var data = editor.getValue();

    $.post(url, data, function(response) {
      console.log(response);
      google.processResponse(response);
    });
  });



  $('#fetch').click(function() {
    var url = $('#provider-url').val();
    google.crawl(url);
  });

    // Set up email content editor.
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: {name: "htmlmixed"},
    tabMode: "indent"
  });
  editor.setValue('<script type="application/ld+json">\n  ...\n</script>')
  editor.setSize('100%', '150px')






});




var actSbx = {};

actSbx.Google = function() {
  this.url = null;
  this.jsonLd = null;
  this.entities = null;
  this.index = [];
};


actSbx.Google.snippetTpl = '<div class="entity">' +
  '<p><a href="{{id}}">{{name}}</a></p>' +
  '<p>Sample snippet here bla bla bkla</p>' +
  '<div class="action-widget"></div></div>';


actSbx.Google.prototype.crawl = function(url) {
  var G = this;

  //todo: encode
  var url = location.origin + '/fetch?url=' + url;

  $.get(url, function(response) {
    G.processResponse(response);

  })
};

actSbx.Google.prototype.processResponse = function(response) {
  var responseObj = JSON.parse(response);
  this.entities = responseObj['entities'];
  $('#raw-results').show();
  $('#log').text(JSON.stringify(this.entities, undefined, 2));
  $('#validation-errors').text('').text(responseObj['errors'])
  $('#entities').html('');
  this.displayEntities(responseObj['entities_with_operations'])
};

actSbx.Google.prototype.displayEntities = function(entityIds) {
  var el = $('#entities');
  var G = this;
  if (entityIds) {
    $.each(entityIds, function(id, entityId) {
      entity = G.entities[entityId]
      G.renderSnippet(el, entity);
    })
  }

};



actSbx.Google.prototype.renderSnippet = function(el, entity) {
  var G = this;
  var view = {
    name: entity.name,
    id: entity['@id']
  };
  console.log(entity)
  var output = Mustache.render(actSbx.Google.snippetTpl, view);
  el.append($(output))

  var operation = G.entities[entity.operation['@id']]
  var handler = G.entities[operation.actionHandler['@id']]

  var actionWidgetClass = actSbx.actionTypeToWidgetMap[operation['@type']];
  if (actionWidgetClass) {
    var widget = new actionWidgetClass(entity, operation, handler);
    widget.render($('.action-widget'));
  } else {
    if ($('#validation-errors').text()) {
      $('#validation-errors').append($('<br>'));
    }
    $('#validation-errors').append('Action ' + operation['@type'] + ' not implemented')
  }
}




actSbx.ActionWidget = function(url, method) {
  this.url = url;
  this.method = method;
};

actSbx.RateActionWidget = function(entity, operation, handler) {
  console.log(handler)

  actSbx.ActionWidget.call(this, handler.url, handler.httpMethod);

  this.operation_ = operation;
  this.handler_ = handler;
  this.button_ = null;
};

actSbx.RateActionWidget.prototype = new actSbx.ActionWidget();

actSbx.RateActionWidget.prototype.render = function(parent) {
  this.button_ = $('<button class="action-link">Rate</button>');
  parent.append(this.button_);
  this.log_ = $('<div class="log"></div>');
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
      type: 'POST',
      data: JSON.stringify({
        url: self.url,
        params: {'value': $(this).val()}
      }),
      //processData: false,
      contentType: 'application/json; charset=utf-8',
      complete: function(e) {
        //alert('Action was complated');
        console.log(e)

        var response = JSON.parse(e.responseText)
        console.log(response)
        var el = $('<div class="result"></div>');
        self.log_.append(el);

        if (response.errors) {
          self.button_.text('Action unsuccessful:(').addClass('btn-danger').removeClass('btn-success');
          el.append($('<p><span class="text-danger">Request malformed: ' +
            response.errors.join('\n') + '</span></p> '));
        }

        if (response.result && response.result.code === '200 OK') {
          self.button_.text('Rated sucessfully!').addClass('btn-success').removeClass('btn-danger');
        } else {
          self.button_.text('Action unsuccessful:(').addClass('btn-danger').removeClass('btn-success');
        }


        el.append($('<p><span class="status ' + response.result.code + '">' +
            response.result.code + '</span> ' + response.result.url +
            ' <span class="params">' + (response.result.params || '') + '</span></p>' +
            '<p class="debug">Debug: ' + response.result.debug+ '</p>'));
        self.popup_.remove();
      }
    }
    // What is the name of the param?
    // What about multiple ratings?
    $.ajax(location.origin + '/proxy', config);
    self.popup_.remove();
    return false;
  });
};



actSbx.actionTypeToWidgetMap = {
  'ReviewAction': actSbx.RateActionWidget
};





