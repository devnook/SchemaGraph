
//#fcb960
//#fcb960
var SIZES = {
  // Entities
  '<http://schema.org/Restaurant>': 40,
  // Actions
  '<http://schema.org/ReviewAction>': 30,
  '<http://schema.org/CreateAction>': 30,
  '<http://schema.org/QuoteAction>': 30
}

var nodeSize = function(nodeGroup) {
  return SIZES[nodeGroup] || 20;
};


var COLORS = {
  // Entities
  '<http://schema.org/Restaurant>': '#a93938',
  // Actions
  '<http://schema.org/ReviewAction>': '#938a3b',
  '<http://schema.org/CreateAction>': '#938a3b',
  '<http://schema.org/QuoteAction>': '#938a3b',
  // Handlers
  '<http://schema.org/HttpHandler>': '#fcb960'
}

var color = function(nodeType) {
  return COLORS[nodeType] || '#666';
};

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var renderGraph = function(triples, parentId) {

  var detailsWrapper = d3.select(parentId).append("div");
    detailsWrapper.append('h4')
    .text('Node details:');

  var details = detailsWrapper.append("ul")
  .attr('class', 'graph-details')
  .attr("width", 300)
  .attr("height", 100);



  var width = $(window).width(),
  height = $(window).height() - 200;



  var force = d3.layout.force()
  .charge(-400)
  .linkDistance(60)
  .size([width, height]);

  var svg = d3.select(parentId).append("svg")
  .attr("width", width)
  .attr("height", height);

  var process = function(error, graph) {
    force
    .nodes(graph.nodes)
    .links(graph.links)
    .start();

    var glinks = svg.selectAll(".link")
    .data(graph.links)
    .enter().append("line")
    .attr("class", "link")
    .classed('glink', true)
    .style("stroke-width", function(d) { return Math.sqrt(d.value); });

    var label = glinks.append("text")
      .text('aaa')



    var gnodes = svg.selectAll("g.node")
    .data(graph.nodes)
    .enter()
    .append('g')
    .classed('gnode', true);

    var node = gnodes.append("circle")
    .attr("class", "node")
    .attr("r", function(d) {
      return nodeSize(d.group);
    })
    .style("fill", function(d) { return color(d.group); });

      //.call(force.drag);

      var labels = gnodes.append("text")
      .attr('class', 'label')
      .text(function(d) {
        /*
        if (d.name.indexOf('<') === 0) {
          d.name = d.name.replace('<http://', '').replace('>', '')
          d.name = d.name.substring(d.name.indexOf('/'));
        } else {
          d.name = d.name.replace(/\"/g, '')
        }*/
        var group;
        if (d.group) {
          group = d.group.toString().replace('<http://schema.org/', '').replace('>', '') + ': '
        } else {
          group = '? : '
        }
        return group + (d.displayName || d.name);
      });

      node.append("title")
      .text(function(d) { return d.name; });

      force.on("tick", function() {
        glinks.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });


    //node.attr("cx", function(d) { return d.x; })
    //    .attr("cy", function(d) { return d.y; });

    gnodes.attr("transform", function(d) {
      return 'translate(' + [d.x, d.y] + ')';
    });
    label.attr("transform", function(d) {
      return 'translate(' + [d.x, d.y] + ')';
    });

    gnodes.on("mouseover",function(d){
      var sel = d3.select(this);
      sel.moveToFront();
      $.each(sel.data()[0].properties, function(k, v) {
        details.append('li').text(k + ': ' + v)
      })
    })

    gnodes.on("mouseout",function(d){
      details.html('');
    })
  });



  }; // end process

  var nodes = [];
  var links = [];
  var nodeIndexes = {};

  $.each(triples, function(i, triple) {
    //console.log(i)
    console.log(triple)

    var sourceIndex = nodeIndexes[triple[0]];
    if (sourceIndex === undefined) {
      var node = {
        'name': triple[0],
        'properties': {}
      }
      sourceIndex = nodes.push(node) - 1;
      nodeIndexes[node.name] = sourceIndex;
    }



    // Do not draw values

    var targetIndex = nodeIndexes[triple[2]];
    if (targetIndex === undefined) {
      var node2 = {
        'name': triple[2],
        'properties': {}
      }
      targetIndex = nodes.push(node2) - 1;
      nodeIndexes[node2.name] = targetIndex;
    }
    var link = {
      "source": sourceIndex,
      "target": targetIndex,
      "value": 5
    }
    links.push(link)
  });



  //console.log(nodes)
  //console.log(links)
  var g = {
    nodes: nodes,
    links: links
  }
  process(null, g)


};



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