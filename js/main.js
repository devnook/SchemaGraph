



$(document).ready(function(){
  $('#raw-results').hide();

  // Set up html editor.
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: {name: "htmlmixed"},
    tabMode: "indent"
  });
  editor.setValue('<script type="application/ld+json">\n  ...\n</script>')
  editor.setSize('100%', '150px')

  // Enable buttons
  $('#parse').click(function() {
    var url = location.origin + '/parse';
    var data = editor.getValue();
    $.ajax({
      type: "POST",
      url: url,
      data: data,
      success: actions.processResponse,
      error: function(xhr, e, exception) {
        var msg = exception || e.toUpperCase();
        $('#validation-errors').text('').text(msg)
      }
    });
  });

  $('#fetch').click(function() {
    var url = location.origin + '/fetch?url=' + $('#provider-url').val();
    $.get(url, actions.processResponse);
  });

  $('#graph-render').on('click', function () {
    var graph = JSON.parse($('pre#graph-log').text().trim());
    $('#graph').html('');
    renderGraph(graph, '#graph');
  });
});


var actions = actions || {};

actions.PROXY_URL = location.origin + '/proxy';

actions.snippetTpl = '<div class="entity" data-id="{{id}}">' +
  '<p><a href="{{id}}">{{name}}</a></p>' +
  '<p>This is an example search result </p>' +
  '<div class="action-widget"></div>' +
  '<div class="action-log"></div></div>';


actions.processResponse = function(response) {
  var responseObj = JSON.parse(response);
  $('#graph').html('');

  //this.renderGraph(responseObj.graph);
  $('#validation-errors').html('').html(responseObj['errors'].join('<br/>'))
  $('#entities').html('');
  if (responseObj['entities'].length) {
    $('#raw-results').show();
    $('#entities-log').text(JSON.stringify(responseObj.entities, undefined, 2));
    $('#graph-log').text(JSON.stringify(responseObj.graph, undefined, 2));
    actions.displayEntities(responseObj['entities'])
  }
};

actions.displayEntities = function(entities) {
  var el = $('#entities');
  $('#entities-section').show();
  $('#api-calls-section').show();
  $.each(entities, function(id, entity) {
    actions.renderSnippet(el, entity);
  })
};
i = 0

actions.renderSnippet = function(el, entity) {
  var view = {
    name: entity['http://schema.org/name'],
    id: entity['@id']
  };
  console.log(entity)


  var entityEl = $('.entity[data-id="' + entity['@id'] + '"]');
  if (!entityEl.length) {
    var output = Mustache.render(actions.snippetTpl, view);
    entityEl = $(output);
    el.append(entityEl);
  }



  $.each(actions.supportedOperationProperties, function(i, property) {
    var operations = [];
    if (property === 'http://schema.org/operation') {
      operations = entity['http://schema.org/operation'] || [];
    } else if (entity[property]) {
      operations = entity[property]['http://schema.org/operation'] || [];
    }
    if (operations && !$.isArray(operations)) {
        operations = [operations]
    }

    $.each(operations, function(j, operation) {
      //console.log('operation')
      console.log(entity)
      console.log(operations)
      var actionWidgetClass = actions.actionTypeToWidgetMap[operation['@type']];
      if (actionWidgetClass) {
        try {
          var widget = new actionWidgetClass(operation);
          widget.render(entityEl.find('.action-widget'), $('#api-calls'));
        } catch (e) {

          var  msg = (e instanceof actions.ActionWidget.Exception) ?
              e.message : 'Application error';

          if ($('#validation-errors').text()) {
            $('#validation-errors').append($('<br>'));
          }
          $('#validation-errors').append(msg);
          throw e;
        }
      } else {
        if ($('#validation-errors').text()) {
          $('#validation-errors').append($('<br>'));
        }
        $('#validation-errors').append('Action ' + operation['@type'] + ' not implemented')
      }

    });
  })

}


// Actions widget base class ***************************************************


actions.ActionWidget = function(name, handler) {
  this.button_ = null;
  this.log_ = null;
  if (!name) {
    throw new actions.ActionWidget.Exception('Missing action name');
  }
  if (!handler) {
    throw new actions.ActionWidget.Exception('Missing action handler');
  }
  this.name_ = name;
  this.handler_ = handler;
};


actions.ActionWidget.Exception = function(message) {
   this.message = message;
   this.name = 'ActionWidgetException';
}


actions.ActionWidget.prototype.render = function(widgetParent, logEl) {
  this.el_ = this.el_ || $('<div></div>');
  this.button_ = this.button_ || $(
      '<button class="action-link btn">' + this.name_ + '</button>');
  this.log_ = logEl || $('<div class="log"></div>');
  this.el_.append(this.button_);
  widgetParent.append(this.el_);
  this.button_.on('click', $.proxy(this.launch, this));
};


actions.ActionWidget.prototype.updateWidgetState = function(success) {
  if (success) {
    this.button_.text('Action "' + this.name_ + '" sucessful!')
      .addClass('btn-success')
      .removeClass('btn-danger');
  } else {
    this.button_.text('Action "' + this.name_ + '" unsuccessful:(')
      .addClass('btn-danger')
      .removeClass('btn-success');
  }
}


// ReviewAction widget *********************************************************

actions.ReviewActionWidget = function(operation) {

  var handler = operation['http://schema.org/actionHandler'];
  var name = handler['http://schema.org/name'] || 'Review';
  var actionHandler = actions.createActionHandler(handler);

  actions.ActionWidget.call(this, name, actionHandler);
};
actions.ReviewActionWidget.prototype = Object.create(
    actions.ActionWidget.prototype);


actions.ReviewActionWidget.prototype.launch = function() {
  // TODO(ewag): Add support for multiple action handlers.
  this.popup_ = $('<div class="popup"><p>' + this.name_  +
    '</p><p><select><option value="1">1</option><option value="2">2</option>' +
    '<option value="3">3</option></select></p><p>' +
    '<a href="#" class="btn cancel">cancel</a></p></div>');
  $('body').append(this.popup_);

  var self = this;
  this.popup_.find('.cancel').on('click', $.proxy(function() {
    this.popup_.remove();
    return false;
  }, this));

  this.popup_.find('select').change($.proxy(function(e) {
    var callback = $.proxy(function(e) {
      this.updateWidgetState(e)
      this.popup_.remove();
    }, this);
    this.handler_.trigger({'value': $(e.target).val()}, this.log_, callback);
    this.popup_.remove();
    return false;
  }, this));
};


// QuoteAction widget **********************************************************

actions.QuoteActionWidget = function(operation) {
  actions.ActionWidget.call(this, operation);
};
actions.QuoteActionWidget.prototype = Object.create(
    actions.ActionWidget.prototype);


actions.QuoteActionWidget.prototype.launch = function() {
  this.handler_.trigger({}, this.log_, $.proxy(this.updateWidgetState, this));
};


// SearchAction widget **********************************************************

actions.createActionHandler = function(handler) {
  if (!handler) {
    throw new actions.ActionWidget.Exception('Missing action handler');
  }
  var url = handler['http://schema.org/url']['@id'];
  var handlerClass = actions.actionHandlerTypes[handler['@type']];
  if (!handlerClass) {
    throw new actions.ActionWidget.Exception(
      'Unknown handler type: ' + handler['@type']);
  }
  return new handlerClass(url);
}


actions.SearchActionWidget = function(operation) {

  var handler = operation['http://schema.org/actionHandler'];
  var name = handler['http://schema.org/name'] || 'Search';
  var actionHandler = actions.createActionHandler(handler);

  actions.ActionWidget.call(this, name, actionHandler);
};
actions.SearchActionWidget.prototype = Object.create(
    actions.ActionWidget.prototype);


actions.SearchActionWidget.prototype.launch = function() {
  var callback = function(success, response) {
    this.updateWidgetState(success);

    var el = $('#entities');
    for (var i = 0, entity; entity = response.entities[i]; i++) {
      actions.renderSnippet(el, entity);
    }

    //TODO(ewag): Check for expectations.
    /*
    for (var i = 0, entity; entity = response.entities[i]; i++) {
      if (entity['@type'] == 'http://schema.org/FoodEstablishmentReservation') {
        var actionWidgetClass = actions.actionTypeToWidgetMap[entity['http://schema.org/operation']['@type']];
        if (actionWidgetClass) {
          console.log(entity)
          //TODO(ewag): Factor out.
          var el = $('<div><p>Reservation for ' + entity['http://schema.org/partySize'] + ' at ' + entity['http://schema.org/startTime']['@value'] + '</p></div>')
          this.el_.parent().append(el);
          var widget = new actionWidgetClass(entity['http://schema.org/operation']);
          widget.render(el, this.log_);
        }
      }
    }*/
  }

  this.handler_.trigger({'test': 'someval'}, this.log_, $.proxy(callback, this));
};


actions.ReserveActionWidget = function(operation) {


  var handler = operation['http://schema.org/actionHandler'];
  var name = handler['http://schema.org/name'] || 'Reserve';
  var actionHandler = actions.createActionHandler(handler);

  actions.ActionWidget.call(this, name, actionHandler);
};
actions.ReserveActionWidget.prototype = Object.create(
    actions.ActionWidget.prototype);





actions.ReserveActionWidget.prototype.launch = function() {
  var callback = function(success, response) {
    this.updateWidgetState(success);
    console.log(response)

    var el = $('#entities');
    for (var i = 0, entity; entity = response.entities[i]; i++) {
      actions.renderSnippet(el, entity);
    }


    //TODO(ewag): Check for expectations.

    for (var i = 0, entity; entity = response.entities[i]; i++) {
      if (entity['@type'] == 'http://schema.org/FoodEstablishmentReservation') {
        var status = entity['http://schema.org/reservationStatus'] ;
        if (status == 'ResevationAvailable') {
          this.button_.text('Reservation available')
          var actionWidgetClass = actions.actionTypeToWidgetMap[entity['http://schema.org/operation']['@type']];
          if (actionWidgetClass) {
            var widget = new actionWidgetClass(entity['http://schema.org/operation']);
            widget.render(this.el_, this.log_);
          }
        } else if (status == 'ResevationHeld') {
          this.button_.text('Reservation held temporarily, please confrim')

          var actionWidgetClass = actions.actionTypeToWidgetMap[entity['http://schema.org/operation']['@type']];
          if (actionWidgetClass) {
            var widget = new actionWidgetClass(entity['http://schema.org/operation']);
            widget.render(this.el_.parent(), this.log_);
          } else {
            // raise error
            throw new actions.ActionWidget.Exception('Unknown action type');
          }
        }
      }
    }
  }
  this.handler_.trigger({'test': 'someval'}, this.log_, $.proxy(callback, this));
};



actions.ConfirmActionWidget = function(operation) {

  console.log(operation)

  var handler = operation['http://schema.org/actionHandler'];
  var name = handler['http://schema.org/name'] || 'Reserve';
  var actionHandler = actions.createActionHandler(handler);

  actions.ActionWidget.call(this, name, actionHandler);
};
actions.ConfirmActionWidget.prototype = Object.create(
    actions.ActionWidget.prototype);





actions.ConfirmActionWidget.prototype.launch = function() {
  var callback = function(success, response) {
    this.updateWidgetState(success);
    if (response.entities[0]['http://schema.org/reservationStatus'] == 'ReservationConfirmed') {
      this.button_.text('Confirmed')
    }




  }
  this.handler_.trigger({'test': 'someval'}, this.log_, $.proxy(callback, this));
};


// Action Handlers *************************************************************

actions.ActionHandler = function(url) {
  this.url_ = url;
};


actions.ActionHandler.prototype.trigger = function(url) {
  console.log('Trigger method not implemented');
};

actions.ActionHandler.prototype.trigger = function(url) {
  console.log('Callback method not implemented');
};

// HTTP Handler ****************************************************************

actions.HttpHandler = function(url) {
  actions.ActionHandler.call(this, url);
};
actions.HttpHandler.prototype = Object.create(actions.ActionHandler.prototype);


actions.HttpHandler.prototype.trigger = function(params, resultBox, callback) {
  var result = $('<div class="log"><p class="sending">Sending request to ' + this.url_ + ' ...</p></div>');
  resultBox.append(
      result);
  var config = {
    type: 'POST',
    data: JSON.stringify({
      url: this.url_,
      params: params
    }),
    contentType: 'application/json; charset=utf-8',
    complete: $.proxy(function(e) {
      var successAndResponse = this.callback(result, e);
      callback(successAndResponse[0], successAndResponse[1]);
    }, this)
  }
  // What is the name of the param?
  // What about multiple ratings?
  $.ajax(actions.PROXY_URL, config);
};


actions.HttpHandler.prototype.callback = function(el, e) {
  var success = false;
  if (e.status !== 200) {
    el.append($('<p><span class="text-danger">Server error</span></p> '));
    return [success, null];
  }
  var response = JSON.parse(e.responseText)
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
    }
    el.append($('<p><span class="status ' + response.result.code + '">' +
        response.result.code + '</span> ' + response.result.url +
        ' <span class="params">' + (response.result.params || '') +
        '</span></p>' +
        '<p class="debug">Debug: ' + response.result.debug+ '</p>'));
  }
  var content = response.result ? response.result.content : null;
  return [success, response];
}


// WebPage Handler *************************************************************

actions.WebPageHandler = function(url) {
  actions.ActionHandler.call(this, url);
};
actions.WebPageHandler.prototype = Object.create(
    actions.ActionHandler.prototype);


actions.WebPageHandler.prototype.trigger = function(
    params, resultBox, callback) {
  resultBox.append(
      $('<p class="debug">Redirecting to ' + this.url_ + ' ...</p> '));
  window.open(this.url_, this.url_);
  callback(true);
};


// Schema.org implementation bindings ******************************************
// This section is volatile and will change often till the spec is finalized.

actions.actionTypeToWidgetMap = {
  'http://schema.org/ReviewAction': actions.ReviewActionWidget,
  'http://schema.org/QuoteAction': actions.QuoteActionWidget,
  'http://schema.org/SearchAction': actions.SearchActionWidget,
  'http://schema.org/ReserveAction': actions.ReserveActionWidget,
  'http://schema.org/ConfirmAction': actions.ConfirmActionWidget
};


actions.supportedOperationProperties = [
  'http://schema.org/operation',
  'http://schema.org/reservations',
  'http://schema.org/orders'
];

actions.actionHandlerTypes = {
  'http://schema.org/HttpHandler': actions.HttpHandler,
  'http://schema.org/WebPageHandler': actions.WebPageHandler
}
