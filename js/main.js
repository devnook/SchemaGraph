
var processResponse = function(response) {
  var responseObj = JSON.parse(response);
  console.log(responseObj)
  $('#graph').html('');

  $('#errors').html('').html(responseObj['errors'].join('<br/>'))
  $('#raw-results').show();
  $('#graph-log').text(JSON.stringify(responseObj.graph, undefined, 2));
  var graph = JSON.parse($('pre#graph-log').text().trim());
    $('#graph').html('');
    renderGraph(graph, '#graph');
};


$(document).ready(function(){
  $('#raw-results').hide();

  // Set up html editor.
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: {name: "htmlmixed"},
    tabMode: "indent"
  });
  editor.setValue('<span itemscope itemtype="http://schema.org/Restaurant" itemid="http://www.urbanspoon.com/r/1/5609/restaurant/Ballard/Rays-Boathouse-Seattle">\n' +
    '<span itemprop="name">Pizza place</span>\n' +
    '<span itemprop="operation" itemscope itemtype="http://schema.org/ViewAction">\n' +
    '<span itemprop="name">AAA</span>\n' +
    '</span></span>')
  editor.setSize('100%', '150px')

  // Enable buttons
  $('#parse').click(function() {
    var url = location.origin + '/parse';
    var data = editor.getValue();
    $.ajax({
      type: "POST",
      url: url,
      data: data,
      success: processResponse,
      error: function(xhr, e, exception) {
        var msg = exception || e.toUpperCase();
        $('#validation-errors').text('').text(msg)
      }
    });
  });

  $('#fetch').click(function() {
    var url = location.origin + '/fetch?url=' + $('#provider-url').val();
    $.get(url, processResponse);
  });

  $('#graph-render').on('click', function () {
    var graph = JSON.parse($('pre#graph-log').text().trim());
    $('#graph').html('');
    renderGraph(graph, '#graph');
  });
});




String.prototype.noSchema = function() {
  return this.replace('http://schema.org/', '');
}
String.prototype.addSchema = function() {
  return 'http://schema.org/' + this;
}


