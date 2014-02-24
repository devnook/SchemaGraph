



$(document).ready(function(){
  var google = new actSbx.Google();

  $('#raw-results').hide();

  $('#parse').click(function() {
    var url = location.origin + '/parse';

    var data = editor.getValue();

    $.post(url, data, function(response) {
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
  $('#log').text(JSON.stringify(responseObj.graph, undefined, 2));
  $('#graph').html('');

  //this.renderGraph(responseObj.graph);
  $('#validation-errors').text('').text(responseObj['errors'])
  $('#entities').html('');
  this.displayEntities(responseObj['entities'])
};

actSbx.Google.prototype.displayEntities = function(entities) {
  var el = $('#entities');
  var G = this;
  if (entities) {
    $.each(entities, function(id, entity) {
      G.renderSnippet(el, entity);
    })
  }

};



actSbx.Google.supportedOperationProperties = [
  'http://schema.org/operation',
  'http://schema.org/reservations'
];

actSbx.Google.prototype.renderSnippet = function(el, entity) {
  var G = this;
  var view = {
    name: entity['http://schema.org/name'],
    id: entity['@id']
  };
  console.log(entity)
  var output = Mustache.render(actSbx.Google.snippetTpl, view);
  el.append($(output))

  var operations = [];

  var operation = entity['http://schema.org/operation'];

  if (operation) {
    var actionWidgetClass = actSbx.actionTypeToWidgetMap[operation['@type']];
    if (actionWidgetClass) {
      var widget = new actionWidgetClass(operation);
      widget.render($('.action-widget'));
    } else {
      if ($('#validation-errors').text()) {
        $('#validation-errors').append($('<br>'));
      }
      $('#validation-errors').append('Action ' + operation['@type'] + ' not implemented')
    }

  }

  $.each(actSbx.Google.supportedOperationProperties, function(property) {
    if (entity[property]) {
      if (entity[property]) {

      }

    }
  })




}




actSbx.ActionWidget = function(operation) {
  this.operation_ = operation;
  this.button_ = null;
  this.log_ = null;
  this.method_ = operation['http://schema.org/actionHandler']['http://schema.org/httpMethod'];
  this.name_ = operation['http://schema.org/actionHandler']['http://schema.org/name'];
  this.url_ = operation['http://schema.org/actionHandler']['http://schema.org/url'];
};



actSbx.ActionWidget.prototype.render = function(parent) {
  this.button_ = $('<button class="action-link">' + this.name_ + '</button>');
  this.log_ = $('<div class="log"></div>');
  parent.append(this.button_);
  parent.append(this.log_);
  var self = this;
  this.button_.on('click', $.proxy(this.launch, this));
};



actSbx.ActionWidget.prototype.callback = function(e) {
  var el = $('<div class="result"></div>');
  this.log_.append(el);
  if (e.status !== 200) {
    el.append($('<p><span class="text-danger">Server error</span></p> '));
    return;
  }
  var response = JSON.parse(e.responseText)
  this.button_.text('Action unsuccessful:(').addClass('btn-danger').removeClass('btn-success');
  if (response.errors.length) {

    el.append($('<p><span class="text-danger">Request malformed: ' +
      response.errors.join('\n') + '</span></p> '));
  }

  if (response.warnings.length) {
    el.append($('<p><span class="text-warning">Warning: ' +
      response.warnings.join('\n') + '</span></p> '));
  }

  if (response.result) {
    if (response.result.code === '200 OK') {
      this.button_.text('Rated sucessfully!').addClass('btn-success').removeClass('btn-danger');
    }
    el.append($('<p><span class="status ' + response.result.code + '">' +
        response.result.code + '</span> ' + response.result.url +
        ' <span class="params">' + (response.result.params || '') + '</span></p>' +
        '<p class="debug">Debug: ' + response.result.debug+ '</p>'));
  }
}


actSbx.RateActionWidget = function(operation) {
  actSbx.ActionWidget.call(this, operation);
};

actSbx.RateActionWidget.prototype = Object.create(actSbx.ActionWidget.prototype);



actSbx.RateActionWidget.prototype.launch = function() {
  // Seems there might be multiple action handlers.
  this.popup_ = $('<div class="popup"><p>' + this.name_  +
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
        url: self.url_,
        params: {'value': $(this).val()}
      }),
      //processData: false,
      contentType: 'application/json; charset=utf-8',
      complete: function(e) {
        self.callback(e)
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
  'http://schema.org/ReviewAction': actSbx.RateActionWidget
};





