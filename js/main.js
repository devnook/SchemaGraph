



$(document).ready(function(){
  var google = new actSbx.Google();

  $('#raw-results').hide();

  $('#parse').click(function() {
    var url = location.origin + '/parse';

    var data = editor.getValue();

    $.ajax({
      type: "POST",
      url: url,
      data: data,
      success: $.proxy(google.processResponse, google),
      error: function(xhr, e, exception) {
        var msg = exception || e.toUpperCase();
        $('#validation-errors').text('').text(msg)
      }
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

  $('#graph-render').on('click', function () {
        var graph = JSON.parse($('pre#log').text().trim());


        $('#graph').html('');
        renderGraph(graph, '#graph');
      })
});




var actSbx = {};

actSbx.PROXY_URL = location.origin + '/proxy';


actSbx.Google = function() {
  this.url = null;
  this.jsonLd = null;
  this.entities = null;
  this.index = [];
};


actSbx.Google.snippetTpl = '<div class="entity">' +
  '<p><a href="{{id}}">{{name}}</a></p>' +
  '<p>This is an example search result </p>' +
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




  $('#graph').html('');

  //this.renderGraph(responseObj.graph);
  $('#validation-errors').text('').text(responseObj['errors'])
  $('#entities').html('');
  if (responseObj['entities'].length) {
    this.displayEntities(responseObj['entities'])
    $('#raw-results').show();
    $('#log').text(JSON.stringify(responseObj.graph, undefined, 2));
  }
};

actSbx.Google.prototype.displayEntities = function(entities) {
  var el = $('#entities');
  var G = this;

  $('#entities-section').show();

  $.each(entities, function(id, entity) {
    G.renderSnippet(el, entity);
  })


};



actSbx.Google.supportedOperationProperties = [
  'http://schema.org/operation',
  'http://schema.org/reservations',
  'http://schema.org/orders'
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


  $.each(actSbx.Google.supportedOperationProperties, function(i, property) {
    var operations;
    if (property === 'http://schema.org/operation') {
      operations = entity['http://schema.org/operation'] || [];
    } else if (entity[property]) {
      operations = entity[property]['http://schema.org/operation'] || [];
    }
    if (operations && !$.isArray(operations)) {
        operations = [operations]
    }

    $.each(operations, function(j, operation) {
      console.log('operation')
      console.log(operation)
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

    });
  })




}




actSbx.ActionWidget = function(operation) {
  this.operation_ = operation;
  this.button_ = null;
  this.log_ = null;
  this.method_ = operation['http://schema.org/actionHandler']['http://schema.org/httpMethod'];
  this.name_ = operation['http://schema.org/actionHandler']['http://schema.org/name'];
  this.url_ = operation['http://schema.org/actionHandler']['http://schema.org/url']['@id'];
};



actSbx.ActionWidget.prototype.render = function(parent) {
  this.button_ = $('<button class="action-link btn">' + this.name_ + '</button>');
  this.log_ = $('<div class="log"></div>');
  parent.append(this.button_);
  parent.append(this.log_);
  var self = this;
  this.button_.on('click', $.proxy(this.launch, this));
};






actSbx.ActionWidget.prototype.callback = function(success) {
  if (success) {
    this.button_.text('Rated sucessfully!').addClass('btn-success').removeClass('btn-danger');
  } else {
    this.button_.text('Action unsuccessful:(').addClass('btn-danger').removeClass('btn-success');
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

  this.handler = new actSbx.HttpHandler(this.url_);

  this.popup_.find('select').change( function() {
    var el = $('<div class="result"></div>');
    self.log_.append(el);

    var callback = function(e) {
      self.callback(e)
      self.popup_.remove();
    }

    self.handler.trigger({'value': $(this).val()}, el, callback);
    self.popup_.remove();
    return false;
  });
};



actSbx.actionTypeToWidgetMap = {
  'http://schema.org/ReviewAction': actSbx.RateActionWidget,
  'http://schema.org/QuoteAction': actSbx.RateActionWidget
};


actSbx.HttpHandler = function(url) {
  this.url_ = url;
};

actSbx.HttpHandler.prototype.trigger = function(params, resultBox, callback) {

  resultBox.append($('<p class="debug">Sending request to ' + this.url_ + ' ...</p> '));

  var self = this;

  var config = {
    type: 'POST',
    data: JSON.stringify({
      url: this.url_,
      params: params
    }),
    //processData: false,
    contentType: 'application/json; charset=utf-8',
    complete: function(e) {
      var success = self.callback(resultBox, e);
      callback(success);
    }
  }
  // What is the name of the param?
  // What about multiple ratings?
  $.ajax(actSbx.PROXY_URL, config);
};



actSbx.HttpHandler.prototype.callback = function(el, e) {
  var success = false;
  if (e.status !== 200) {
    el.append($('<p><span class="text-danger">Server error</span></p> '));
    return success;
  }
  var response = JSON.parse(e.responseText)
  //this.button_.text('Action unsuccessful:(').addClass('btn-danger').removeClass('btn-success');
  if (response.errors && response.errors.length) {
    el.append($('<p><span class="text-danger">Request malformed: ' +
      response.errors.join('\n') + '</span></p> '));
  }

  if (response.warnings && response.warnings.length) {
    el.append($('<p><span class="text-warning">Warning: ' +
      response.warnings.join('\n') + '</span></p> '));
  }

  if (response.result) {
    if (response.result.code === '200 OK') {
      success = true;
      //this.button_.text('Rated sucessfully!').addClass('btn-success').removeClass('btn-danger');
    }
    el.append($('<p><span class="status ' + response.result.code + '">' +
        response.result.code + '</span> ' + response.result.url +
        ' <span class="params">' + (response.result.params || '') + '</span></p>' +
        '<p class="debug">Debug: ' + response.result.debug+ '</p>'));
  }
  return success;
}