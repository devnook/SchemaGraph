
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

def runquery(g):
  q = """
  SELECT ?s ?o
  WHERE {
    ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/HttpHandler> .
    NOT EXISTS { ?s <http://schema.org/url> ?o . }
  }
  """
  print 'rows'
  for row in g.query(q):
    print 'rows'
    print row


