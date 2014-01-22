



$(document).ready(function(){
  var google = new actSbx.Google();

  $('#search').click(function() {
    google.search($('#search-term').val())
  });



  $('#fetch').click(function() {
    var url = $('#provider-url').val();
    google.crawl(url);
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



actSbx.Google.prototype.crawl = function(url) {
  var G = this;

  //todo: encode
  var url = location.origin + '/fetch?url=' + url;

  $.get(url, function(response) {
    var responseObj = JSON.parse(response);
    G.entities = responseObj['entities'];
    console.log(response)
    console.log(G.jsonLd)
    $('#log').text(JSON.stringify(G.entities));
    $('#validation-errors').text(responseObj['errors'])

    // Structured Data entities.
    var el = $('#entities');
    if (G.entities) {
      $.each(G.entities, function(id, entity) {
        var view = {
          name: entity['http://schema.org/name'][0]['@value'],
          id: entity['@id']
        };
        console.log(entity)
        var output = Mustache.render("<li><b>{{name}}</b> (ID:{{id}})</li>", view);
        el.append($(output))
      })
    }
  })
};


actSbx.Google.prototype.search = function(term) {
  var entity = this.index[term];
  if (entity) {
    console.log(this.index[term]);

    // This probably would happen somewhere else.
    // Do we usually expect a page here? or json feed?
    var G = this;

      console.log(entity)
      var view = {
        url: this.url,
        entity: entity,
        entityString: JSON.stringify(entity)
      };

      var output = Mustache.render('<div><a href="{{url}}">{{url}}</a><p>{{entity.@type}}: {{entity.name}} <span class="action-widget"></span></p>', view);
      $('#search-results').html(output);

      console.log(G.url)
      console.log(rateAction)
      // !!!!!!!!!!!!!!
      var rateAction = new actSbx.RateActionWidget(entity.operation, 'http://localhost:8080' + entity['@id']);
      rateAction.render($('#search-results .action-widget'));

      rateAction.eventEmitter.on('action-call', function(e, status, url, data) {
        $('#provider-log').append($('<p><span class="status ' + status + '">' + status + '</span> ' + url + ' <span class="params">' + data + '</span></p>'));
      });


      $('#search-results test').html(output);





  }

};

actSbx.ActionWidget = function(url, method) {
  this.url = url;
  this.method = method;
  this.eventEmitter = $('<span></span>');
};

actSbx.RateActionWidget = function(operation, url) {
  actSbx.ActionWidget.call(this, url, operation.actionHandler[0].httpMethod);

  this.operation_ = operation;
  this.button_ = null;
};

actSbx.RateActionWidget.prototype = new actSbx.ActionWidget();

actSbx.RateActionWidget.prototype.render = function(parent) {
  this.button_ = $('<button class="action-link">Rate</button>');
  parent.append(this.button_);
  var self = this;
  this.button_.on('click', $.proxy(this.popup, this));
};

actSbx.RateActionWidget.prototype.popup = function() {
  // Seems there might be multiple action handlers.
  this.popup_ = $('<div class="popup"><p>' + this.operation_.actionHandler[0].name  +
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
        console.log(e)
        self.eventEmitter.trigger('action-call', [e.status + ' ' + e.statusText, this.url, this.data])
      }
    }
    // What is the name of the param?
    // What about multiple ratings?
    $.ajax(self.url, config);
    self.popup_.remove();
    return false;
  });
};









