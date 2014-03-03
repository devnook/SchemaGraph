

var G = GreenTurtle;

GreenTurtle.implementation.processors["microdata"].enabled = true;


$(document).ready(function(){
  $('#raw-results').hide();

  // Set up html editor.
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: {name: "htmlmixed"},
    tabMode: "indent"
  });
  editor.setValue('<span itemscope itemtype="http://schema.org/Restaurant" itemid="http://www.urbanspoon.com/r/1/5609/restaurant/Ballard/Rays-Boathouse-Seattle">\n' +
  '<span itemprop="operation" itemscope itemtype="http://schema.org/ViewAction">\n' +
    '</span></span>')
  editor.setSize('100%', '150px')

  // Enable buttons
  $('#parse').click(function() {
    var node = $('<div></div>').html(editor.getValue())
    //$('body').append(node)
    $('#graph').html('')

    var processor = GreenTurtle.implementation.processors["microdata"];
    var graph = processor.processNode(node);
    console.log(node.data)
    //console.log(node.data.getValues())
    console.log(graph)
    renderGraph(graph.triples, '#graph')
  });
});


var processTriples = function(node) {

   var queue = [];
   queue.push({ current: node, parent: null});

   while (queue.length>0) {
      var item = queue.shift();
      var current = item.current;
      console.log(item)


      for (var child = current.lastChild; child; child = child.previousSibling) {
         if (child.nodeType==Node.ELEMENT_NODE) {
            queue.unshift({ current: child, parent: current});
         }
      }
   }
}


