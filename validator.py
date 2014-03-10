
import rdflib
from rdflib.plugins import sparql


def prepare_query(validation_rule):
  return (rdflib.plugins.sparql.prepareQuery(validation_rule[0]),
          validation_rule[1])


# Expect this to be supplied externally.
VALIDATION_QUERIES = map(prepare_query, [
    ('SELECT ?s WHERE { ?s <http://schema.org/operation> ?o}', 'No operation present'),
])


def validate(g):



  errors = set()
  for q in VALIDATION_QUERIES:
    if len(g.query(q[0])) < 1:
      errors.add(q[1])
  return  errors




import rdflib
from rdflib import Graph, URIRef, RDF,  plugin
from rdflib.parser import Parser
plugin.register('json-ld', Parser, 'rdflib_jsonld.parser', 'JsonLDParser')


rdf_data = '''{
  "@context": {
    "@vocab": "http://schema.org/"
  },
  "person":{
    "@id": "person",
    "@type": "http://schema.org/Person",
    "http://schema.org/address": {
      "@id": "address",
      "http://schema.org/streetAddress": "123 Main Street"
    }
  }
}'''
graph = rdflib.Graph()
graph.parse(data=rdf_data, format='json-ld')


from rdflib import Graph, URIRef, Namespace
from rdflib.plugins.sparql import prepareQuery

class PathQuery:

  def __init__(self, path_query, base='http://schema.org/'):
    path = path_query.split('/')
    sparql_target = self.build_sparql_path(path)
    self.fetch_query = prepareQuery('SELECT ?result WHERE {{ ?root {0}}}'.format(sparql_target), initNs={'ns': Namespace(base)})
    self.exists_query = prepareQuery('ASK WHERE {{ ?root {0}}}'.format(sparql_target), initNs={'ns': Namespace(base)})

  def build_sparql_path(self, property_path):
    prop = property_path[0]
    if not (':' in prop):
      prop = 'ns:' + prop
    if len(property_path) == 1:
      return '{0} ?result '.format(prop)
    else:
      return '{0} [ {1}]'.format(prop, self.build_sparql_path(property_path[1:]))

  def get(self, graph, root):
    return graph.query(self.fetch_query,
      initBindings={'root': root})

  def exists(self, graph, root):
    resultset = graph.query(self.exists_query,
      initBindings={'root': root})
    first_result = iter(resultset).next()
    return first_result


class PathQueryConstraint:

  def __init__(self, path_query, base='http://schema.org/'):
    path = path_query.split('/')
    self.target = PathQuery('/'.join(path[:-1]), base)
    self.constraint = PathQuery(path[-1], base)

  def validate(self, graph, root):
    for row in self.target.get(graph, root):
      target = row[0]
      if self.constraint.exists(graph, target):
        return True
    return False



rdf_data = '''{
  "@context": {
    "@vocab": "http://schema.org/"
  },
  "person":{
    "@id": "restaurant",
    "@type": "http://schema.org/Restaurant",
    "operation": {
        "@id": "aaa",
        "@type": "SearchAction",
        "actionStatus": "proposed",
        "actionHandler": [
            {
                "@type": "HttpHandler",
                "name": "Review this restaurant",
                "httpMethod": "get",
                "url": "http://googleknowledge.github.io/ActionsSamples/restaurant.html"
            }
        ]
    }
  }
}'''

graph = rdflib.Graph()
graph.parse(data=rdf_data, format='json-ld')



SUPPORTED_TYPES = {
  'http://schema.org/SearchAction': [
     ('actionHandler/url', 'Missing actionHandler'),
  ]
}

def runquery(g):
  for schema_type in SUPPORTED_TYPES:
    for rule in SUPPORTED_TYPES[schema_type]:
      constraint = PathQueryConstraint(rule[0])
      for root in graph.subjects(predicate=RDF.type, object=URIRef(schema_type)):
        print root
        print 'OK' if constraint.validate(graph, root) else  rule[1]






